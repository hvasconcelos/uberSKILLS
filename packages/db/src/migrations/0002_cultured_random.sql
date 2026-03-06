CREATE TABLE `sandbox_states` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_id` text NOT NULL,
	`name` text NOT NULL,
	`zip_path` text NOT NULL,
	`file_index` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sandbox_states_skill_id` ON `sandbox_states` (`skill_id`);--> statement-breakpoint
ALTER TABLE `test_runs` ADD `sandbox_state_id` text;--> statement-breakpoint
ALTER TABLE `test_runs` ADD `sandbox_result` text;