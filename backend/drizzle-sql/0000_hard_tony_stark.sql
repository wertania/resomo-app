CREATE TABLE "base_interview_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"transcript" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "base_interview_sessions" ADD CONSTRAINT "base_interview_sessions_tenant_id_base_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."base_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interview_sessions_tenant_id_idx" ON "base_interview_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "interview_sessions_created_at_idx" ON "base_interview_sessions" USING btree ("created_at");