CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`encrypted` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `skill_files` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_id` text NOT NULL,
	`path` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`type` text DEFAULT 'resource' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_skill_files_skill_id` ON `skill_files` (`skill_id`);--> statement-breakpoint
CREATE TABLE `skill_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_id` text NOT NULL,
	`version` integer NOT NULL,
	`content_snapshot` text NOT NULL,
	`metadata_snapshot` text NOT NULL,
	`change_summary` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_skill_versions_skill_id_version` ON `skill_versions` (`skill_id`,`version`);--> statement-breakpoint
CREATE TABLE `skills` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`trigger` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`model_pattern` text,
	`content` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_skills_slug` ON `skills` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_skills_status` ON `skills` (`status`);--> statement-breakpoint
CREATE INDEX `idx_skills_updated_at` ON `skills` (`updated_at`);--> statement-breakpoint
CREATE TABLE `test_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_id` text NOT NULL,
	`model` text NOT NULL,
	`system_prompt` text NOT NULL,
	`user_message` text NOT NULL,
	`assistant_response` text,
	`arguments` text DEFAULT '{}' NOT NULL,
	`prompt_tokens` integer,
	`completion_tokens` integer,
	`total_tokens` integer,
	`latency_ms` integer,
	`ttft_ms` integer,
	`status` text DEFAULT 'running' NOT NULL,
	`error` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_test_runs_skill_id` ON `test_runs` (`skill_id`);--> statement-breakpoint
CREATE INDEX `idx_test_runs_created_at` ON `test_runs` (`created_at`);