import { SearchParamsProps } from "@/types";

interface QuestionTabProps extends SearchParamsProps {
	userId: string;
	clerkId?: string | null;
}

const AnswerTab = async ({
	searchParams,
	userId,
	clerkId,
}: QuestionTabProps) => {
	return <div>AnswerTab</div>;
};
export default AnswerTab;
