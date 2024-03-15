// This is for all server actions for the Questions model
"use server";

import { connectToDatabase } from "@/lib/mongoose";
import Question from "@/database/question.model";
import Tag from "@/database/tags.model";
import {
	CreateQuestionParams,
	DeleteQuestionParams,
	EditQuestionParams,
	GetQuestionByIdParams,
	GetQuestionsParams,
	QuestionVoteParams,
} from "./shared.types";
import User from "@/database/user.model";
import { revalidatePath } from "next/cache";
import Answer from "@/database/answer.model";
import Interaction from "@/database/interaction.model";
import { FilterQuery } from "mongoose";

export async function getQuestions(params: GetQuestionsParams) {
	try {
		connectToDatabase();

		const { searchQuery, filter, page = 1, pageSize = 20 } = params;

		// Calulate the number of posts to skip based on the page number and page size
		const skipAmount = (page - 1) * pageSize;

		const query: FilterQuery<typeof Question> = {};

		if (searchQuery) {
			query.$or = [
				{ title: { $regex: new RegExp(searchQuery, "i") } },
				{ content: { $regex: new RegExp(searchQuery, "i") } },
			];
		}

		let sortOptions = {};

		switch (filter) {
			case "newest":
				sortOptions = { createdAt: -1 };
				break;
			case "frequent":
				sortOptions = { views: -1 };
				break;
			case "unanswered":
				query.answers = { $size: 0 };
				break;
			default:
				break;
		}

		const questions = await Question.find(query)
			.populate({
				path: "tags",
				model: Tag,
			})
			.populate({ path: "author", model: User })
			.skip(skipAmount)
			.limit(pageSize)
			.sort(sortOptions);

		const totalQuestions = await Question.countDocuments(query);

		// Example: 100 => 4 * 20 + 20 = 100 means no next button
		// 101 => 4 * 20 + 20 = 100 means there would be a next button
		const isNext = totalQuestions > skipAmount + questions.length;

		return { questions, isNext };
	} catch (error) {
		console.log(error);
		throw error;
	}
}

export async function createQuestion(params: CreateQuestionParams) {
	try {
		connectToDatabase();

		// Destructure params  to get info for DB
		const { title, content, tags, author, path } = params;

		// Create the question
		const question = await Question.create({
			title,
			content,
			author,
		});

		const tagDocuments = [];

		// Create the tags or get them if they already exist
		for (const tag of tags) {
			const existingTag = await Tag.findOneAndUpdate(
				{
					name: { $regex: new RegExp(`^${tag}$`, "i") },
				},
				{
					$setOnInsert: { name: tag },
					$push: { questions: question._id },
				},
				{
					upsert: true,
					new: true,
				}
			);

			tagDocuments.push(existingTag._id);
		}

		await Question.findByIdAndUpdate(question._id, {
			$push: { tags: { $each: tagDocuments } },
		});

		// Create an interaction record for the user's ask_question action

		// Increment author's reputation by +5 for creating a question

		revalidatePath(path);
	} catch (error) {}
}

export async function getQuestionById(params: GetQuestionByIdParams) {
	try {
		connectToDatabase();

		const { questionId } = params;

		const question = await Question.findById(questionId)
			.populate({ path: "tags", model: Tag, select: "_id name" })
			.populate({
				path: "author",
				model: User,
				select: "_id clerkId name picture",
			});

		return question;
	} catch (error) {
		console.log(error);
		throw error;
	}
}

export async function upvoteQuestion(params: QuestionVoteParams) {
	try {
		connectToDatabase();

		const { questionId, userId, hasUpvoted, hasDownvoted, path } = params;

		let updateQuery = {};

		if (hasUpvoted) {
			updateQuery = { $pull: { upvotes: userId } };
		} else if (hasDownvoted) {
			updateQuery = {
				$pull: { downvotes: userId },
				$push: { upvotes: userId },
			};
		} else {
			updateQuery = { $addToSet: { upvotes: userId } };
		}

		const question = await Question.findByIdAndUpdate(questionId, updateQuery, {
			new: true,
		});

		if (!question) {
			throw new Error("Question not found");
		}

		// TODO: Increment author's reputation

		revalidatePath(path);
	} catch (error) {
		console.log(error);
		throw error;
	}
}

export async function downvoteQuestion(params: QuestionVoteParams) {
	try {
		connectToDatabase();

		const { questionId, userId, hasUpvoted, hasDownvoted, path } = params;

		let updateQuery = {};

		if (hasDownvoted) {
			updateQuery = { $pull: { downvotes: userId } };
		} else if (hasUpvoted) {
			updateQuery = {
				$pull: { upvotes: userId },
				$push: { downvotes: userId },
			};
		} else {
			updateQuery = { $addToSet: { downvotes: userId } };
		}

		const question = await Question.findByIdAndUpdate(questionId, updateQuery, {
			new: true,
		});

		if (!question) {
			throw new Error("Question not found");
		}

		// TODO: Increment author's reputation

		revalidatePath(path);
	} catch (error) {
		console.log(error);
		throw error;
	}
}

export async function deleteQuestion(params: DeleteQuestionParams) {
	try {
		connectToDatabase();

		const { questionId, path } = params;

		// Delete the question
		await Question.deleteOne({ _id: questionId });

		// Delete all answers associated with that question
		await Answer.deleteMany({ question: questionId });

		// Delete any interactions with the deleted question ID
		await Interaction.deleteMany({ question: questionId });

		// Update tags to no longer reference the deleted question
		await Tag.updateMany(
			{ questions: questionId },
			{ $pull: { questions: questionId } }
		);

		revalidatePath(path);
	} catch (error) {
		console.log(error);
		throw error;
	}
}

export async function editQuestion(params: EditQuestionParams) {
	try {
		connectToDatabase();

		const { questionId, title, content, path } = params;

		// Find question to edit
		const question = await Question.findById(questionId).populate("tags");

		if (!question) {
			throw new Error("Question not found");
		}

		// Update question fields
		question.title = title;
		question.content = content;

		await question.save();

		revalidatePath(path);
	} catch (error) {
		console.log(error);
		throw error;
	}
}

export async function getHotQuestions() {
	try {
		connectToDatabase();

		const hotQuestions = await Question.find({})
			.sort({ views: -1, upvotes: -1 })
			.limit(5);

		return hotQuestions;
	} catch (error) {
		console.log(error);
		throw error;
	}
}
