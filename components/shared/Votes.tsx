"use client";

import { useEffect } from "react";
import { downvoteAnswer, upvoteAnswer } from "@/lib/actions/answer.action";
import {
	downvoteQuestion,
	upvoteQuestion,
} from "@/lib/actions/question.action";
import { toggleSaveQuestion } from "@/lib/actions/user.action";
import { formatAndDivideNumber } from "@/lib/utils";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { viewQuestion } from "@/lib/actions/interaction.action";
import { toast } from "../ui/use-toast";

interface VotesProps {
	type: string;
	itemId: string;
	userId: string;
	upvotes: number;
	hasUpvoted: boolean;
	downvotes: number;
	hasDownvoted: boolean;
	hasSaved?: boolean;
}

const Votes = ({
	type,
	itemId,
	userId,
	upvotes,
	hasUpvoted,
	downvotes,
	hasDownvoted,
	hasSaved,
}: VotesProps) => {
	const pathname = usePathname();
	const router = useRouter();

	const handleSave = async () => {
		await toggleSaveQuestion({
			userId: JSON.parse(userId),
			questionId: JSON.parse(itemId),
			path: pathname,
		});

		return toast({
			title: `Question ${!hasSaved ? "saved" : "removed from saved posts"}`,
			variant: !hasSaved ? "default" : "destructive",
		});
	};

	const handleVote = async (action: string) => {
		// Check to make sure user is logged in
		if (!userId) {
			return toast({
				title: "Please log in",
				description: "You must be logged in to perform this action",
			});
		}

		if (action === "upvote") {
			if (type === "Question") {
				await upvoteQuestion({
					questionId: JSON.parse(itemId),
					userId: JSON.parse(userId),
					hasUpvoted,
					hasDownvoted,
					path: pathname,
				});
			} else if (type === "Answer") {
				await upvoteAnswer({
					answerId: JSON.parse(itemId),
					userId: JSON.parse(userId),
					hasUpvoted,
					hasDownvoted,
					path: pathname,
				});
			}

			return toast({
				title: `Upvote ${!hasUpvoted ? "successful" : "removed"}`,
				variant: !hasUpvoted ? "default" : "destructive",
			});
		}

		if (action === "downvote") {
			if (type === "Question") {
				await downvoteQuestion({
					questionId: JSON.parse(itemId),
					userId: JSON.parse(userId),
					hasUpvoted,
					hasDownvoted,
					path: pathname,
				});
			} else if (type === "Answer") {
				await downvoteAnswer({
					answerId: JSON.parse(itemId),
					userId: JSON.parse(userId),
					hasUpvoted,
					hasDownvoted,
					path: pathname,
				});
			}

			return toast({
				title: `Downvote ${!hasDownvoted ? "successful" : "removed"}`,
				variant: !hasDownvoted ? "default" : "destructive",
			});
		}
	};

	useEffect(() => {
		viewQuestion({
			questionId: JSON.parse(itemId),
			userId: userId ? JSON.parse(userId) : undefined,
		});
	}, [itemId, userId, pathname, router]);

	return (
		<div className="flex gap-5">
			<div className="flex-center gap-2.5">
				<div className="flex-center gap-1.5">
					<Image
						src={
							hasUpvoted
								? "/assets/icons/upvoted.svg"
								: "/assets/icons/upvote.svg"
						}
						alt="upvote"
						width={18}
						height={18}
						className="cursor-pointer"
						onClick={() => {
							handleVote("upvote");
						}}
					/>
					<div className="flex-center background-light700_dark400 min-w-[18px] rounded-sm p-1">
						<p className="subtle-medium text-dark400_light900">
							{formatAndDivideNumber(upvotes)}
						</p>
					</div>
				</div>
				<div className="flex-center gap-1.5">
					<Image
						src={
							hasDownvoted
								? "/assets/icons/downvoted.svg"
								: "/assets/icons/downvote.svg"
						}
						alt="downvote"
						width={18}
						height={18}
						className="cursor-pointer"
						onClick={() => {
							handleVote("downvote");
						}}
					/>
					<div className="flex-center background-light700_dark400 min-w-[18px] rounded-sm p-1">
						<p className="subtle-medium text-dark400_light900">
							{formatAndDivideNumber(downvotes)}
						</p>
					</div>
				</div>
			</div>

			{type === "Question" && (
				<Image
					src={
						hasSaved
							? "/assets/icons/star-filled.svg"
							: "/assets/icons/star-red.svg"
					}
					alt="star"
					width={18}
					height={18}
					className="cursor-pointer"
					onClick={handleSave}
				/>
			)}
		</div>
	);
};
export default Votes;
