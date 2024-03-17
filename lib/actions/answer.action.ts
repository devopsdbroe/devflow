"use server";

import Answer from "@/database/answer.model";
import { connectToDatabase } from "../mongoose";
import {
	AnswerVoteParams,
	CreateAnswerParams,
	DeleteAnswerParams,
	GetAnswersParams,
} from "./shared.types";
import Question from "@/database/question.model";
import { revalidatePath } from "next/cache";
import Interaction from "@/database/interaction.model";
import User from "@/database/user.model";

export async function createAnswer(params: CreateAnswerParams) {
	try {
		connectToDatabase();

		const { content, author, question, path } = params;

		// Create new answer
		const newAnswer = await Answer.create({
			content,
			author,
			question,
		});

		// Add answer to the question's answers array
		const questionObject = await Question.findByIdAndUpdate(question, {
			$push: { answers: newAnswer._id },
		});

		await Interaction.create({
			user: author,
			action: "answer",
			question,
			answer: newAnswer._id,
			tags: questionObject.tags,
		});

		await User.findByIdAndUpdate(author, { $inc: { reputation: 10 } });

		revalidatePath(path);
	} catch (error) {
		console.log(error);
		throw error;
	}
}

export async function getAnswers(params: GetAnswersParams) {
	try {
		connectToDatabase();

		const { questionId, sortBy, page = 1, pageSize = 10 } = params;

		const skipAmount = (page - 1) * pageSize;

		let sortOptions = {};

		switch (sortBy) {
			case "highestUpvotes":
				sortOptions = { upvotes: -1 };
				break;
			case "lowestUpvotes":
				sortOptions = { upvotes: 1 };
				break;
			case "recent":
				sortOptions = { createdAt: -1 };
				break;
			case "old":
				sortOptions = { createdAt: 1 };
				break;
			default:
				break;
		}

		const answers = await Answer.find({ question: questionId })
			.skip(skipAmount)
			.limit(pageSize)
			.populate("author", "_id clerkId name picture")
			.sort(sortOptions);

		// Calculate number of answers only for the specific question we're looking at
		const totalAnswer = await Answer.countDocuments({ question: questionId });

		const isNextAnswer = totalAnswer > skipAmount + answers.length;

		return { answers, isNextAnswer };
	} catch (error) {
		console.log(error);
		throw error;
	}
}

export async function upvoteAnswer(params: AnswerVoteParams) {
	try {
		connectToDatabase();

		const { answerId, userId, hasUpvoted, hasDownvoted, path } = params;

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

		const answer = await Answer.findByIdAndUpdate(answerId, updateQuery, {
			new: true,
		});

		if (!answer) {
			throw new Error("Answer not found");
		}

		// Increment user's reputation by -2 or +2 for upvoting an answer
		await User.findByIdAndUpdate(userId, {
			$inc: { reputation: hasUpvoted ? -2 : 2 },
		});

		// Increment answer author's reputation by -10 or +10 per upvote
		await User.findByIdAndUpdate(answer.author, {
			$inc: { reputation: hasUpvoted ? -10 : 10 },
		});

		revalidatePath(path);
	} catch (error) {
		console.log(error);
		throw error;
	}
}

export async function downvoteAnswer(params: AnswerVoteParams) {
	try {
		connectToDatabase();

		const { answerId, userId, hasUpvoted, hasDownvoted, path } = params;

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

		const answer = await Answer.findByIdAndUpdate(answerId, updateQuery, {
			new: true,
		});

		if (!answer) {
			throw new Error("Answer not found");
		}

		// Increment user's reputation by -2 or +2 for downvoting an answer
		await User.findByIdAndUpdate(userId, {
			$inc: { reputation: hasDownvoted ? -2 : 2 },
		});

		// Increment answer author's reputation by -10 or +10 per downvote
		await User.findByIdAndUpdate(answer.author, {
			$inc: { reputation: hasDownvoted ? -10 : 10 },
		});

		revalidatePath(path);
	} catch (error) {
		console.log(error);
		throw error;
	}
}

export async function deleteAnswer(params: DeleteAnswerParams) {
	try {
		connectToDatabase();

		const { answerId, path } = params;

		// Find the answer to be deleted
		const answer = await Answer.findById({ _id: answerId });

		if (!answer) {
			throw new Error("Answer not found");
		}

		// Delete the answer
		await answer.deleteOne({ _id: answerId });

		// Update any questions associated with that answer
		await Question.updateMany(
			{ _id: answer.question },
			{ $pull: { answers: answerId } }
		);

		// Delete any interactions that have the deleted answer ID
		await Interaction.deleteMany({ answer: answerId });

		revalidatePath(path);
	} catch (error) {
		console.log(error);
		throw error;
	}
}
