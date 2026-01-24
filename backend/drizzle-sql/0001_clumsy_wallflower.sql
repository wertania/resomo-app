ALTER TABLE "base_interview_sessions" ALTER COLUMN "transcript" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "base_interview_sessions" ADD COLUMN "file_id" uuid NOT NULL;--> statement-breakpoint
CREATE INDEX "interview_sessions_file_id_idx" ON "base_interview_sessions" USING btree ("file_id");