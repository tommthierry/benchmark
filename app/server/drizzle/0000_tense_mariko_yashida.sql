CREATE TABLE `benchmark_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`iteration_number` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`models_count` integer DEFAULT 0 NOT NULL,
	`questions_count` integer DEFAULT 0 NOT NULL,
	`config_snapshot` text,
	`error_log` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`execution_id` text NOT NULL,
	`evaluator_type` text NOT NULL,
	`evaluator_model_id` text,
	`score` real NOT NULL,
	`max_score` real DEFAULT 100 NOT NULL,
	`normalized_score` real NOT NULL,
	`justification` text,
	`criteria_scores` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`execution_id`) REFERENCES `task_executions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`evaluator_model_id`) REFERENCES `models`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `models` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`provider_model_id` text NOT NULL,
	`display_name` text NOT NULL,
	`label` text,
	`status` text DEFAULT 'active' NOT NULL,
	`context_size` integer,
	`cost_input_per_million` real,
	`cost_output_per_million` real,
	`config` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`api_endpoint` text NOT NULL,
	`api_key_env_var` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`rate_limit_per_minute` integer DEFAULT 60,
	`config` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `providers_name_unique` ON `providers` (`name`);--> statement-breakpoint
CREATE TABLE `question_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`weight` real DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `question_types_name_unique` ON `question_types` (`name`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`type_id` text NOT NULL,
	`content` text NOT NULL,
	`expected_answer` text,
	`evaluation_method` text DEFAULT 'llm_judge' NOT NULL,
	`evaluation_criteria` text,
	`difficulty` text DEFAULT 'medium',
	`weight` real DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`type_id`) REFERENCES `question_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rankings` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`model_id` text NOT NULL,
	`ranking_type` text NOT NULL,
	`dimension` text,
	`position` integer NOT NULL,
	`score` real NOT NULL,
	`previous_position` integer,
	`delta_position` integer,
	`delta_score` real,
	`sample_size` integer NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `benchmark_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `task_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`model_id` text NOT NULL,
	`question_id` text NOT NULL,
	`input_prompt` text NOT NULL,
	`response_content` text,
	`response_time_ms` integer,
	`tokens_input` integer,
	`tokens_output` integer,
	`cost` real,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`raw_response` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `benchmark_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE no action
);
