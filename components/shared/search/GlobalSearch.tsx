"use client";

import { Input } from "@/components/ui/input";
import { formUrlQuery, removeKeysFromQuery } from "@/lib/utils";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import GlobalResult from "./GlobalResult";

const GlobalSearch = () => {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const query = searchParams.get("q");

	const [search, setSearch] = useState(query || "");
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		const delayDebounceFn = setTimeout(() => {
			if (search) {
				const newUrl = formUrlQuery({
					params: searchParams.toString(),
					key: "global",
					value: search,
				});

				router.push(newUrl, { scroll: false });
			} else {
				if (query) {
					const newUrl = removeKeysFromQuery({
						params: searchParams.toString(),
						keysToRemove: ["global", "type"],
					});

					router.push(newUrl, { scroll: false });
				}
			}
		}, 300);

		return () => clearTimeout(delayDebounceFn);
	}, [search, pathname, router, searchParams, query]);

	return (
		<div className="relative w-full max-w-[600px] max-lg:hidden">
			<div className="background-light800_darkgradient relative flex min-h-[56px] grow items-center gap-1 rounded-xl px-4">
				<Image
					src="/assets/icons/search.svg"
					alt="search"
					width={24}
					height={24}
					className="cursor-pointer"
				/>
				<Input
					type="text"
					placeholder="Search globally"
					value={search}
					onChange={(e) => {
						setSearch(e.target.value);

						if (!isOpen) setIsOpen(true);
						if (e.target.value === "" && isOpen) setIsOpen(false);
					}}
					className="paragraph-regular no-focus placeholder background-light800_darkgradient text-dark400_light900 border-none shadow-none"
				/>
			</div>
			{isOpen && <GlobalResult />}
		</div>
	);
};

export default GlobalSearch;
