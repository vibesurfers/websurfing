pnpm db:generate

> websurfing@0.1.0 db:generate /home/mhm/Documents/vibesurfers/websurfing
> drizzle-kit generate

No config path provided, using default 'drizzle.config.ts'
Reading config file '/home/mhm/Documents/vibesurfers/websurfing/drizzle.config.ts'

~ userId › user_id column will be renamed

~ providerAccountId › provider_account_id column will be renamed
--- all columns conflicts in websurfing_account table resolved ---


~ sheetid › sheet_id column will be renamed

~ userid › user_id column will be renamed

~ rowindex › row_index column will be renamed

~ colindex › col_index column will be renamed

~ operatorname › operator_name column will be renamed

~ statusmessage › status_message column will be renamed

~ updatedat › updated_at column will be renamed
--- all columns conflicts in websurfing_cell_processing_status table resolved ---


~ sheetid › sheet_id column will be renamed

~ userid › user_id column will be renamed

~ rowindex › row_index column will be renamed

~ colindex › col_index column will be renamed

~ createdat › created_at column will be renamed

~ updatedat › updated_at column will be renamed
--- all columns conflicts in websurfing_cell table resolved ---


~ sessionid › session_id column will be renamed

~ userresponse › user_response column will be renamed

~ responsetype › response_type column will be renamed

~ isrequired › is_required column will be renamed

~ createdat › created_at column will be renamed

~ answeredat › answered_at column will be renamed
--- all columns conflicts in websurfing_clarification_prompt table resolved ---


~ sheetid › sheet_id column will be renamed

~ datatype › data_type column will be renamed

+ operator_type column will be created

+ operator_config column will be created

+ prompt column will be created

+ dependencies column will be created

+ validation_rules column will be created

+ is_required column will be created

+ default_value column will be created

~ createdat › created_at column will be renamed

~ updatedat › updated_at column will be renamed
--- all columns conflicts in websurfing_column table resolved ---


~ sheetid › sheet_id column will be renamed

~ userid › user_id column will be renamed

~ eventtype › event_type column will be renamed

~ retrycount › retry_count column will be renamed

~ lasterror › last_error column will be renamed

~ createdat › created_at column will be renamed

~ processedat › processed_at column will be renamed
--- all columns conflicts in websurfing_event_queue table resolved ---


~ userId › user_id column will be renamed

~ operatorName › operator_name column will be renamed

~ promptTokens › prompt_tokens column will be renamed

~ outputTokens › output_tokens column will be renamed

~ totalTokens › total_tokens column will be renamed

~ estimatedCost › estimated_cost column will be renamed

~ eventId › event_id column will be renamed

~ requestData › request_data column will be renamed

~ responseData › response_data column will be renamed

~ errorMessage › error_message column will be renamed

~ durationMs › duration_ms column will be renamed

~ createdAt › created_at column will be renamed
--- all columns conflicts in websurfing_gemini_usage_log table resolved ---


~ createdById › created_by_id column will be renamed

~ createdAt › created_at column will be renamed

~ updatedAt › updated_at column will be renamed
--- all columns conflicts in websurfing_post table resolved ---


~ sessionToken › session_token column will be renamed

~ userId › user_id column will be renamed
--- all columns conflicts in websurfing_session table resolved ---


~ sheetid › sheet_id column will be renamed

~ userid › user_id column will be renamed

~ rowindex › row_index column will be renamed

~ colindex › col_index column will be renamed

~ updatetype › update_type column will be renamed

~ createdat › created_at column will be renamed

~ appliedat › applied_at column will be renamed
--- all columns conflicts in websurfing_sheet_updates table resolved ---


~ userid › user_id column will be renamed

~ templatetype › template_type column will be renamed

~ templateId › template_id column will be renamed

~ isautonomous › is_autonomous column will be renamed

~ webhookUrl › webhook_url column will be renamed

~ webhookEvents › webhook_events column will be renamed

~ createdat › created_at column will be renamed

~ updatedat › updated_at column will be renamed
--- all columns conflicts in websurfing_sheet table resolved ---


~ templateid › template_id column will be renamed

~ operatortype › operator_type column will be renamed

~ operatorconfig › operator_config column will be renamed

~ datatype › data_type column will be renamed

~ validationrules › validation_rules column will be renamed

~ isrequired › is_required column will be renamed

~ defaultvalue › default_value column will be renamed

~ createdat › created_at column will be renamed

~ updatedat › updated_at column will be renamed
--- all columns conflicts in websurfing_template_column table resolved ---


~ userid › user_id column will be renamed

~ ispublic › is_public column will be renamed

~ isautonomous › is_autonomous column will be renamed

~ systemprompt › system_prompt column will be renamed

~ usagecount › usage_count column will be renamed

~ createdat › created_at column will be renamed

~ updatedat › updated_at column will be renamed
--- all columns conflicts in websurfing_template table resolved ---


~ eventid › event_id column will be renamed

~ userid › user_id column will be renamed

~ currentstep › current_step column will be renamed

~ totalsteps › total_steps column will be renamed

~ createdat › created_at column will be renamed

~ updatedat › updated_at column will be renamed

~ completedat › completed_at column will be renamed
--- all columns conflicts in websurfing_transformer_session table resolved ---


~ emailVerified › email_verified column will be renamed

+ api_key column will be created

+ api_key_created_at column will be created
--- all columns conflicts in websurfing_user table resolved ---

16 tables
websurfing_account 11 columns 1 indexes 1 fks
websurfing_cell_processing_status 9 columns 3 indexes 2 fks
websurfing_cell 8 columns 3 indexes 2 fks
websurfing_clarification_prompt 10 columns 2 indexes 1 fks
websurfing_column 14 columns 2 indexes 1 fks
websurfing_event_queue 10 columns 4 indexes 2 fks
websurfing_gemini_usage_log 15 columns 4 indexes 1 fks
websurfing_post 5 columns 2 indexes 1 fks
websurfing_session 3 columns 1 indexes 1 fks
websurfing_sheet_updates 9 columns 5 indexes 2 fks
websurfing_sheet 10 columns 2 indexes 2 fks
websurfing_template_column 14 columns 2 indexes 1 fks
websurfing_template 12 columns 3 indexes 1 fks
websurfing_transformer_session 11 columns 3 indexes 2 fks
websurfing_user 7 columns 0 indexes 0 fks
websurfing_verification_token 3 columns 0 indexes 0 fks

[✓] Your SQL migration file ➜ drizzle/0005_daily_nekra.sql 🚀