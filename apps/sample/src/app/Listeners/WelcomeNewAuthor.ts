import { Listener, ListensTo } from "@vest/events";
import { Mail, HtmlMailable } from "@vest/mail";

interface PostCreatedPayload {
  post: { title: string };
  author: { name: string; email: string };
}

@ListensTo("post.created")
export class WelcomeNewAuthor extends Listener<PostCreatedPayload> {
  async handle(payload: PostCreatedPayload): Promise<void> {
    const mail = new HtmlMailable(
      `<p>Hi ${payload.author.name},</p><p>Your post has been published.</p>`,
      `Your post "${payload.post.title}" is live!`,
    );
    await Mail().mailer().to(payload.author.email).send(mail);
  }
}
