import type { Request, Response } from "express";
import { event } from "@lara-node/events";
import { dispatch } from "@lara-node/queue";
import { Post } from "../../Models/Post.js";
import { ProcessPostAnalytics } from "../../Jobs/ProcessPostAnalytics.js";

export class PostController {
  async index(_req: Request, res: Response): Promise<void> {
    const posts = await Post.where("published", true).orderBy("created_at", "desc").limit(20).get();
    res.json(posts);
  }

  async show(req: Request, res: Response): Promise<void> {
    const post = await Post.find(String(req.params.id));
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    // Dispatch analytics job (non-blocking)
    dispatch(new ProcessPostAnalytics(String(post.id), "view"));

    res.json(post);
  }

  async store(req: Request, res: Response): Promise<void> {
    const author = (req as any).user;
    const { title, body } = req.body;

    if (!title || !body) {
      res.status(422).json({ error: "title and body are required" });
      return;
    }

    const post = await Post.create({ title, body, user_id: author.id, published: true });

    // Fire event — 'post.created' → WelcomeNewAuthor listener sends a mail
    await event("post.created", { post, author });

    res.status(201).json(post);
  }

  async update(req: Request, res: Response): Promise<void> {
    const post = await Post.find(String(req.params.id));
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    if (String(post.user_id) !== String((req as any).user.id)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await post.update(req.body);
    res.json(post);
  }

  async destroy(req: Request, res: Response): Promise<void> {
    const post = await Post.find(String(req.params.id));
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    if (String(post.user_id) !== String((req as any).user.id)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await post.delete();
    res.status(204).send();
  }
}
