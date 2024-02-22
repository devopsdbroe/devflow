// This is for all server actions for the Questions model
"use server";

import { connectToDatabase } from "@/lib/mongoose";

export async function createQuestion(params: any) {
	try {
		connectToDatabase();
	} catch (error) {}
}
