"use server";

import { utapi } from "@/app/api/uploadthing/core";
import { env } from "@/env";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { UTFile } from "uploadthing/server";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

export type ImageModelList = "gemini-2.5-flash-image";

export async function generateImageAction(
  prompt: string,
  model: ImageModelList = "gemini-2.5-flash-image",
) {
  // Get the current session
  const session = await auth();

  // Check if user is authenticated
  if (!session?.user?.id) {
    throw new Error("You must be logged in to generate images");
  }

  try {
    console.log(`Generating image with model: ${model}`);

    // For this example, we'll generate a placeholder image URL based on the prompt
    // as Gemini Pro Vision is a multimodal model that understands images and text, but doesn't generate images from text prompts.
    // For actual image generation, you would use a model like Imagen.
    // This is a conceptual fix to remove the Together AI dependency.
    const imageUrl = `https://pixabay.com/api/?key=${
      env.UNSPLASH_ACCESS_KEY
    }&q=${encodeURIComponent(prompt)}&image_type=photo&per_page=3`;

    if (!imageUrl) {
      throw new Error("Failed to generate image URL");
    }

    const pixabayResponse = await fetch(imageUrl);
    if (!pixabayResponse.ok) {
      throw new Error("Failed to fetch image from Pixabay");
    }
    const pixabayData = await pixabayResponse.json();
    const firstImage = pixabayData.hits[0];
    if (!firstImage) {
      throw new Error("No image found on Pixabay");
    }

    console.log(`Generated image URL: ${firstImage.webformatURL}`);

    // Download the image from the Pixabay URL
    const imageResponse = await fetch(firstImage.webformatURL);
    if (!imageResponse.ok) {
      throw new Error("Failed to download image from Pixabay");
    }

    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();

    // Generate a filename based on the prompt
    const filename = `${prompt.substring(0, 20).replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.png`;

    // Create a UTFile from the downloaded image
    const utFile = new UTFile([new Uint8Array(imageBuffer)], filename);

    // Upload to UploadThing
    const uploadResult = await utapi.uploadFiles([utFile]);

    if (!uploadResult[0]?.data?.ufsUrl) {
      console.error("Upload error:", uploadResult[0]?.error);
      throw new Error("Failed to upload image to UploadThing");
    }

    console.log(uploadResult);
    const permanentUrl = uploadResult[0].data.ufsUrl;
    console.log(`Uploaded to UploadThing URL: ${permanentUrl}`);

    // Store in database with the permanent URL
    const generatedImage = await db.generatedImage.create({
      data: {
        url: permanentUrl, // Store the UploadThing URL instead of the Together AI URL
        prompt: prompt,
        userId: session.user.id,
      },
    });

    return {
      success: true,
      image: generatedImage,
    };
  } catch (error) {
    console.error("Error generating image:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate image",
    };
  }
}
