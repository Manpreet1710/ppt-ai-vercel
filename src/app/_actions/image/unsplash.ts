"use server";

import { type LayoutType } from "@/components/presentation/utils/parser";
import { env } from "@/env";
import { auth } from "@/server/auth";

export interface PixabayImage {
  id: number;
  webformatURL: string;
  largeImageURL: string;
  tags: string;
  user: string;
}

export interface PixabaySearchResponse {
  hits: PixabayImage[];
  total: number;
  totalHits: number;
}

export async function getImageFromUnsplash(
  query: string,
  layoutType?: LayoutType,
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  // Get the current session
  const session = await auth();

  // Check if user is authenticated
  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in to get images" };
  }

  const orientation =
    layoutType === "vertical"
      ? "horizontal"
      : layoutType === "left" || layoutType === "right"
        ? "vertical"
        : "horizontal";

  try {
    // Search for images using Pixabay API
    const response = await fetch(
      `https://pixabay.com/api/?key=${env.UNSPLASH_ACCESS_KEY}&q=${encodeURIComponent(
        query,
      )}&image_type=photo&orientation=${orientation}&per_page=3`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pixabay API error: ${response.status} - ${errorText}`);
    }

    const data: PixabaySearchResponse = await response.json();

    if (!data.hits || data.hits.length === 0) {
      return { success: false, error: "No images found for this query" };
    }

    const firstImage = data.hits[0];
    if (!firstImage) {
      return { success: false, error: "No images found for this query" };
    }

    // Return the image URL directly
    return {
      success: true,
      imageUrl: firstImage.webformatURL,
    };
  } catch (error) {
    console.error("Error getting Pixabay image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get image",
    };
  }
}
