import { Job, Queueable } from '@lara-node/queue';

/*
|--------------------------------------------------------------------------
| GenerateReportJob
|--------------------------------------------------------------------------
|
| Dispatching with custom data:
|   await Queue.push(new GenerateReportJob({ type: 'users', period: 'monthly', userId: 1 }));
|
| Scheduled weekly via QueueServiceProvider:
|   scheduler.job(GenerateReportJob, { type: 'users', period: 'weekly' }).weekly();
|
*/
@Queueable({ queue: 'reports', tries: 2, timeout: 300 })
export class GenerateReportJob extends Job {
  constructor(
    private readonly config: {
      type: 'users' | 'files' | 'activity';
      period: 'daily' | 'weekly' | 'monthly';
      userId?: number | string;
      email?: string;
    } = { type: 'users', period: 'monthly' },
  ) { super(); }

  async handle(): Promise<void> {
    const { type, period } = this.config;
    console.log(`[GenerateReportJob] Generating ${period} ${type} report...`);

    // const data = await this.collectData();
    // await this.generatePdf(data);
    // if (this.config.email) {
    //   await Queue.push(new SendMailJob({ to: this.config.email, subject: 'Your report is ready', body: '...' }));
    // }

    console.log(`[GenerateReportJob] ${period} ${type} report complete`);
  }
}
