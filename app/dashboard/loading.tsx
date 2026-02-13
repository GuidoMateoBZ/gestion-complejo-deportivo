import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-[250px]" />
                <Skeleton className="h-4 w-[350px]" />
            </div>

            {/* Content Area Skeleton - Generic Grid/List/Chart placeholders */}
            <div className="grid gap-6">
                {/* Filters bar placeholder */}
                <div className="flex gap-4">
                    <Skeleton className="h-10 w-[200px]" />
                    <Skeleton className="h-10 w-[200px]" />
                    <Skeleton className="h-10 w-[100px]" />
                </div>

                {/* Main Content Placeholder (Table rows or Cards) */}
                <div className="rounded-lg border shadow-sm p-4 space-y-4">
                    <div className="border-b pb-2">
                        <div className="flex justify-between items-center mb-4">
                            <Skeleton className="h-6 w-full max-w-[150px]" />
                            <Skeleton className="h-6 w-full max-w-[150px]" />
                            <Skeleton className="h-6 w-full max-w-[150px]" />
                            <Skeleton className="h-6 w-full max-w-[80px]" />
                        </div>
                    </div>
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-[250px]" />
                                <Skeleton className="h-4 w-[200px]" />
                            </div>
                            <div className="ml-auto">
                                <Skeleton className="h-8 w-[100px]" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
