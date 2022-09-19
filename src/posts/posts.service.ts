import { BadRequestException, Injectable } from "@nestjs/common";
import { Post } from "@prisma/client";
import { Post as PostModel } from "../models/post.model";
import { UserToken } from "../utils/guards/user.guard";
import { PrismaService } from "../utils/prisma.service";

@Injectable()
export class PostsService {
	constructor(private prisma: PrismaService) {}

	async create(
		user: UserToken,
		content?: string,
		image?: Express.Multer.File,
	): Promise<Post> {
		if (!image && !content)
			throw new BadRequestException(
				"Post must have at least image or text content",
			);

		return await this.prisma.post.create({
			data: {
				content,
				image: image ? image.path : null,
				owner: {
					connect: {
						id: user.id,
					},
				},
			},
		});
	}

	async getFeed(userId: number): Promise<PostModel[]> {
		const rawPosts = await this.prisma.post.findMany({
			orderBy: {
				createdAt: "asc",
			},
			include: {
				owner: {
					select: {
						displayName: true,
						image: true,
						firstName: true,
						lastName: true,
					},
				},
			},
		});

		const likedPosts = await this.prisma.likes.findMany({
			select: {
				id: true,
			},
			where: {
				postId: { in: rawPosts.map((e) => e.id) },
				userId,
			},
		});

		// Allows for O(1) lookup instead of O(n)
		const likes = new Set([...likedPosts].map((e) => e.id));

		return rawPosts.map<PostModel>((e) => ({
			content: e.content,
			createdAt: e.createdAt,
			hasLiked: likes.has(e.id),
			id: e.id,
			image: e.image,
			likes: e.likes,
			userId: e.owner.firstName + e.owner.lastName,
			userImage: e.owner.image,
			userName: e.owner.displayName,
		}));
	}
}
