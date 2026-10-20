// Sinh bởi `php artisan i18n:generate` từ lang/{locale}/*.php — KHÔNG SỬA TAY.
const messages: Record<string, unknown> = {
    "ADMIN_ALERTS": {
        "NAV": "Alerts",
        "TITLE": "Alerts",
        "DESCRIPTION": "When a threshold is crossed every super admin gets an email and a push notification when the incident opens and when it recovers. Checked every 5 minutes.",
        "RULES_TITLE": "Alert rules",
        "FIRING_SINCE": "Firing since {time}",
        "RULES": {
            "failing_channels": {
                "TITLE": "Failing channels",
                "DESCRIPTION": "Inboxes that lost their session or need reauthorization."
            },
            "failed_jobs": {
                "TITLE": "Failed jobs",
                "DESCRIPTION": "Jobs that failed within the window."
            },
            "queue_backlog": {
                "TITLE": "Pending jobs",
                "DESCRIPTION": "Jobs waiting across all queues."
            },
            "queue_wait": {
                "TITLE": "Queue wait",
                "DESCRIPTION": "Oldest pending job across all queues."
            },
            "zalo_bridge_down": {
                "TITLE": "zalo-bridge unreachable",
                "DESCRIPTION": "Without the bridge Zalo messages are neither sent nor received."
            }
        },
        "STATUS": {
            "ok": "Normal",
            "firing": "Firing",
            "pending": "Over threshold, waiting for window",
            "disabled": "Disabled",
            "unknown": "Not measured"
        },
        "STATS": {
            "FIRING": "Firing",
            "ENABLED": "Enabled rules",
            "INCIDENTS_7D": "Incidents (7 days)",
            "RECIPIENTS": "Super admins emailed"
        },
        "COLUMNS": {
            "RULE": "Rule",
            "CURRENT": "Current",
            "THRESHOLD": "Threshold",
            "WINDOW": "Window",
            "COOLDOWN": "Cooldown",
            "STATUS": "Status",
            "ENABLED": "Enabled"
        },
        "WINDOW_MODE": {
            "lookback": "Counted over the last {minutes} min",
            "sustain": "Over threshold for {minutes} min",
            "sustain_now": "Alerts immediately"
        },
        "FIELDS": {
            "THRESHOLD": "Threshold",
            "THRESHOLD_STATE": "Alerts when the bridge does not respond",
            "WINDOW_MINUTES": "Window (minutes)",
            "COOLDOWN_MINUTES": "Cooldown (minutes)",
            "ENABLED": "Enable rule {rule}",
            "EDIT": "Edit",
            "EDIT_RULE": "Edit rule {rule}",
            "SAVE": "Save",
            "CANCEL": "Cancel",
            "MINUTES": "{count} min",
            "INVALID": "Enter whole numbers: threshold 1 or more, window and cooldown 0 to {max} minutes."
        },
        "MEASURED": "Measured {time}",
        "OPEN_PAGE": "Open related page",
        "DISPLAY": {
            "SECONDS": "{count} s",
            "MINUTES": "{count} min",
            "MINUTES_SECONDS": "{minutes} min {seconds} s",
            "HOURS": "{count} h",
            "HOURS_MINUTES": "{hours} h {minutes} min",
            "DOWN": "Unreachable",
            "UP": "Reachable",
            "NONE": "Not measured"
        },
        "INCIDENTS": {
            "TITLE": "Incident history",
            "TOTAL": "{total} incidents",
            "COLUMNS": {
                "RULE": "Rule",
                "OPENED": "Opened",
                "RESOLVED": "Recovered",
                "PEAK": "Peak / threshold",
                "NOTIFIED": "Notification"
            },
            "OPEN": "Firing",
            "NOTIFIED": "Notified",
            "NOT_NOTIFIED": "Not notified, in cooldown",
            "RECOVERY_NOTIFIED": "Notified and recovered",
            "EMPTY_TITLE": "No incidents yet",
            "EMPTY_DESCRIPTION": "When a metric crosses its threshold the incident shows up here."
        },
        "TEST": {
            "BUTTON": "Send test",
            "HINT": "Send a test email and push notification to yourself."
        },
        "PUSH": {
            "TITLE": "Push notifications on this browser",
            "ON": "This browser receives alerts.",
            "OFF": "Enable to get alerts on this device before you open your email.",
            "ENABLE": "Enable push",
            "DISABLE": "Disable on this browser",
            "UNSUPPORTED": "This browser or the server does not support push notifications.",
            "DENIED": "Notifications are blocked for this site. Allow them in the site settings and try again.",
            "FAILED": "Could not enable push notifications. Try again later.",
            "SUBSCRIPTIONS": "{count} of your browsers receive alerts"
        },
        "WIDGET": {
            "OPEN": "Open incidents",
            "LATEST": "Latest",
            "NONE": "No incidents yet.",
            "RESOLVED": "Recovered",
            "VIEW": "Open Alerts"
        },
        "FLASH": {
            "SAVED": "Saved rule :rule.",
            "TEST_SENT": "Sent a test notification to :email.",
            "TEST_FAILED": "Could not send the test notification. Check the application log."
        },
        "VALUES": {
            "UNKNOWN": "not measured",
            "SECONDS": ":count s",
            "DOWN": "unreachable",
            "UP": "reachable"
        },
        "MAIL": {
            "OPENED_SUBJECT": "[Alert] :rule over threshold",
            "OPENED_TITLE": "An alert threshold was crossed",
            "OPENED_VALUE": ":rule: :value (threshold :threshold).",
            "OPENED_STATE": ":rule. :description",
            "OPENED_AT": "Started at :time (Vietnam time).",
            "ACTION": "View details",
            "RESOLVED_SUBJECT": "[Recovered] :rule",
            "RESOLVED_TITLE": "Metric recovered",
            "RESOLVED_VALUE": ":rule is back under threshold: now :value (threshold :threshold).",
            "RESOLVED_STATE": "No longer \":rule\".",
            "RESOLVED_DURATION": "Incident lasted from :from to :to (Vietnam time).",
            "TEST_SUBJECT": "[Test] Operations alerts",
            "TEST_TITLE": "Test notification",
            "TEST_BODY": "This is a test from the Alerts page. Receiving it means this channel works.",
            "TEST_ACTION": "Open Alerts",
            "FOOTER": "Change thresholds or disable rules at :url",
            "SALUTATION": "Operations alerts"
        }
    },
    "ADMIN_DASHBOARD": {
        "TITLE": "Overview",
        "DESCRIPTION": "System-wide numbers. Each widget loads and refreshes on its own.",
        "RANGE": {
            "LABEL": "Date range",
            "PRESETS": {
                "7D": "7 days",
                "30D": "30 days",
                "90D": "90 days"
            },
            "SNAPSHOT": "As of now",
            "PREVIOUS": "Previous period: {value}",
            "COMPARED": "vs previous period"
        },
        "ACTIONS": {
            "CUSTOMIZE": "Customize",
            "DONE": "Done",
            "RESET": "Reset to default",
            "REFRESH": "Refresh {title}",
            "HIDE": "Hide {title}",
            "SHOW": "Show",
            "DRAG": "Drag to move {title}",
            "SIZE": "Width of {title}",
            "MENU": "Options for {title}",
            "RETRY": "Retry",
            "VIEW_ALL": "View all"
        },
        "SIZES": {
            "SM": "Narrow",
            "MD": "Medium",
            "LG": "Wide",
            "FULL": "Full row"
        },
        "EDIT": {
            "HINT": "Drag a handle to reorder (keyboard: Tab to a handle, Space to pick up, arrow keys to move, Space to drop). Changes save automatically.",
            "HIDDEN_TITLE": "Hidden widgets",
            "HIDDEN_EMPTY": "No hidden widgets.",
            "SAVING": "Saving layout…",
            "SAVED": "Layout saved.",
            "SAVE_FAILED": "Could not save the layout. Changes only live in this browser.",
            "ALL_HIDDEN": "All widgets are hidden. Click Customize to show them again.",
            "PICKED_UP": "Picked up {title}.",
            "MOVED_OVER": "{title} is at position {position}.",
            "DROPPED": "Dropped {title} at position {position}.",
            "CANCELLED": "Cancelled moving {title}."
        },
        "STATE": {
            "ERROR": "Could not load the numbers.",
            "EMPTY": "No data in this range yet.",
            "UNAVAILABLE": "Unavailable"
        },
        "WIDGETS": {
            "KPIS": {
                "TITLE": "Key metrics",
                "DESCRIPTION": "Totals and change versus the previous period of equal length."
            },
            "MESSAGES_TREND": {
                "TITLE": "Messages by day",
                "DESCRIPTION": "Incoming and outgoing messages per day."
            },
            "CONVERSATIONS_BY_CHANNEL": {
                "TITLE": "Conversations by channel",
                "DESCRIPTION": "New conversations created in the range, by channel type."
            },
            "CHANNEL_HEALTH": {
                "TITLE": "Channel health",
                "DESCRIPTION": "Inboxes that lost their session or need reauthorization."
            },
            "ALERTS": {
                "TITLE": "Alerts",
                "DESCRIPTION": "Open alert incidents and the latest one."
            },
            "OPERATION_LINKS": {
                "TITLE": "Operations shortcuts",
                "DESCRIPTION": "Jump to the system monitoring dashboards."
            },
            "ACTIVATION_FUNNEL": {
                "TITLE": "Activation funnel",
                "DESCRIPTION": "Only accounts that signed up in the selected range."
            },
            "COHORT_RETENTION": {
                "TITLE": "Retention by signup week",
                "DESCRIPTION": "Share of accounts still replying to customers in the weeks after signup (last 8 weeks)."
            },
            "SIGNUPS_TREND": {
                "TITLE": "Signups by day",
                "DESCRIPTION": "Accounts created per day."
            },
            "TOP_ACCOUNTS": {
                "TITLE": "Most active accounts",
                "DESCRIPTION": "Up to 8 accounts with the most messages in the range."
            },
            "RECENT_SIGNUPS": {
                "TITLE": "Latest accounts",
                "DESCRIPTION": "Up to 8 of the most recent signups."
            },
            "QUEUE_HEALTH": {
                "TITLE": "Queues",
                "DESCRIPTION": "Pending jobs, failed jobs and worker processes."
            },
            "STICKERS": {
                "TITLE": "Sticker library",
                "DESCRIPTION": "Shared library and per-account libraries."
            },
            "SYSTEM": {
                "TITLE": "System",
                "DESCRIPTION": "Versions and database size."
            }
        },
        "METRICS": {
            "ACCOUNTS_TOTAL": "Total accounts",
            "ACCOUNTS_NEW": "New accounts",
            "ACCOUNTS_ACTIVE": "Active accounts",
            "USERS_TOTAL": "Agents",
            "CONVERSATIONS_NEW": "New conversations",
            "MESSAGES_INCOMING": "Incoming messages",
            "MESSAGES_OUTGOING": "Outgoing messages",
            "INBOXES_TOTAL": "Inboxes"
        },
        "FUNNEL_STEPS": {
            "SIGNED_UP": "Account signed up",
            "CONFIRMED_EMAIL": "Email confirmed",
            "CREATED_INBOX": "Inbox created",
            "CONNECTED_CHANNEL": "Channel connected",
            "RECEIVED_MESSAGE": "First customer message",
            "REPLIED": "First reply"
        },
        "FUNNEL": {
            "FROM_START": "{rate}% of signups",
            "PREVIOUS_EMPTY": "No accounts at the previous step",
            "BASELINE": "100% baseline for the steps below",
            "FROM_PREVIOUS": "{rate}% of previous step"
        },
        "TREND": {
            "TOTAL": "Total in range",
            "PEAK": "Peak day",
            "PEAK_INCOMING": "Busiest incoming day",
            "PEAK_MESSAGES": "{count} messages on {date}",
            "ON_DATE": "on {date}",
            "AVERAGE": "Daily average",
            "REPLY_RATIO": "Outgoing per incoming"
        },
        "SERIES": {
            "INCOMING": "Incoming",
            "OUTGOING": "Outgoing",
            "SIGNUPS": "Signups"
        },
        "CHART": {
            "SUMMARY": "{label}: total {total}, peak {max} on {date}.",
            "TABLE": "Data table",
            "DATE": "Date"
        },
        "COHORT": {
            "WEEK": "Signup week",
            "SIZE": "Accounts",
            "OFFSET_GROUP": "% still replying, by week after signup",
            "CELL": "Week of {week}, week {offset}: {active} of {size} accounts ({rate}%)"
        },
        "CHANNEL_HEALTH": {
            "RATE": "Healthy share",
            "HEALTHY": "Healthy",
            "FAILING": "Failing",
            "TOTAL": "{count} inboxes",
            "ALL_HEALTHY": "All inboxes are working normally."
        },
        "CHANNELS": {
            "CENTER": "conversations"
        },
        "LISTS": {
            "MESSAGES": "{count} messages",
            "INBOXES": "{count} inboxes",
            "NO_OWNER": "No administrator yet"
        },
        "QUEUE": {
            "STATUS": {
                "RUNNING": "Running",
                "PAUSED": "Paused",
                "INACTIVE": "Inactive",
                "UNAVAILABLE": "Unavailable"
            },
            "PENDING": "Pending",
            "RECENT_FAILED": "Recently failed",
            "PROCESSES": "Processes",
            "OPEN": "Open Horizon"
        },
        "STICKERS": {
            "SHARED_PACKS": "Shared packs",
            "SHARED_PUBLISHED": "Published",
            "SHARED_STICKERS": "Shared stickers",
            "PRIVATE_ACCOUNTS": "Accounts with own library",
            "PRIVATE_STICKERS": "Private stickers",
            "OPEN": "Manage shared library"
        },
        "SYSTEM": {
            "VERSION": "Version",
            "PHP": "PHP",
            "LARAVEL": "Laravel",
            "ENVIRONMENT": "Environment",
            "DATABASE_SIZE": "Database size",
            "TABLES": "Tables"
        },
        "LINKS": {
            "HORIZON": {
                "TITLE": "Horizon",
                "DESCRIPTION": "Queues and jobs"
            },
            "PULSE": {
                "TITLE": "Pulse",
                "DESCRIPTION": "Application performance"
            },
            "LOGS": {
                "TITLE": "Logs",
                "DESCRIPTION": "Application logs"
            },
            "TASKS": {
                "TITLE": "dash.yona.vn",
                "DESCRIPTION": "Team task board"
            }
        }
    },
    "ADMIN_LAYOUT": {
        "labels": {
            "console_name": "Admin console",
            "close": "Close",
            "cancel": "Cancel",
            "confirm": "Confirm",
            "save": "Save",
            "saving": "Saving…",
            "edit": "Edit",
            "delete": "Delete",
            "view": "View",
            "actions": "Actions",
            "pagination": "Pagination",
            "page_of": "Page {current} of {last}",
            "previous_page": "Previous page",
            "next_page": "Next page",
            "open_menu": "Open menu",
            "navigation": "Navigation",
            "collapse_sidebar": "Collapse sidebar",
            "expand_sidebar": "Expand sidebar",
            "opens_new_tab": "opens in a new tab",
            "search": "Search",
            "search_shortcut_hint": "Search or jump to…",
            "command_title": "Command palette",
            "command_placeholder": "Type a page, account, user, inbox, contact…",
            "command_navigation": "Pages",
            "command_results": "Search results",
            "command_loading": "Searching…",
            "command_error": "Search is unavailable right now. Try again later.",
            "command_empty": "No results for “{query}”.",
            "command_min_chars": "Type at least 2 characters to search data.",
            "command_footer_navigate": "navigate",
            "command_footer_select": "open",
            "command_footer_close": "close",
            "result_account": "Account",
            "result_user": "User",
            "result_inbox": "Inbox",
            "result_contact": "Contact",
            "user_menu": "Admin account",
            "back_to_app": "Back to workspace",
            "logout": "Log out",
            "flash_notice": "Notice",
            "flash_error": "Error",
            "resource_description_accounts": "Businesses using Yona, with their inboxes, conversations, members and latest activity.",
            "resource_description_users": "Everyone who can sign in to Yona, super admins included.",
            "resource_description_access_tokens": "API tokens of users, agent bots and platform apps.",
            "resource_description_installation_configs": "Configuration variables shared by the whole system.",
            "resource_description_agent_bots": "Bots that receive and answer messages for agents through a webhook.",
            "resource_description_platform_apps": "Apps that call the Platform API to manage accounts and users.",
            "resource_description_account_users": "Members of each account and their roles.",
            "resource_description_abuse_reports": "People, messages or conversations reported by users. Change the status once handled.",
            "resource_description_impersonations": "Each time a super admin signed in as a user, with the reason.",
            "records_total": "{total} records",
            "search_records": "Search {resource}…",
            "clear_search": "Clear search",
            "filter": "Filter",
            "filter_all": "All",
            "new_record": "New",
            "no_records": "No records yet",
            "no_records_hint": "Try another keyword or filter.",
            "sort_by": "Sort by {column}",
            "delete_confirm_title": "Delete this record?",
            "delete_confirm_description": "This cannot be undone. Related data may be lost.",
            "edit_title": "Edit {title}",
            "new_title": "New {resource}",
            "create": "Create",
            "account_overview": "360° overview",
            "details": "Details",
            "enabled": "Enabled",
            "disabled": "Disabled",
            "yes": "Yes",
            "no": "No",
            "show_secret": "Show",
            "hide_secret": "Hide",
            "copy": "Copy",
            "copied": "Copied",
            "empty_value": "-",
            "no_suspension_history": "No suspension history recorded.",
            "resend_confirmation": "Resend confirmation email",
            "reset_cache_title": "Reset frontend cache",
            "reset_cache_description": "Clears the IndexedDB cache keys from Redis; the next load fetches data from the backend.",
            "reset_cache": "Reset cache",
            "impersonate_title": "Impersonate",
            "impersonate_warning": "Any action taken after impersonating will appear as if performed by {title}.",
            "impersonate": "Impersonate user",
            "impersonate_reason": "Reason (min {min} characters, logged for audit)",
            "impersonate_confirm": "Confirm & impersonate",
            "account_users_title": "Add member",
            "account_users_account": "Account",
            "account_users_user": "User",
            "account_users_role": "Role",
            "account_users_submit": "Add to account",
            "mfa": "Two-factor authentication",
            "settings_title": "Settings",
            "settings_description": "Instance-wide configuration.",
            "app_config_title": "{section} configuration",
            "app_config_description": "Changes apply to the whole instance right after saving.",
            "instance_status_title": "Instance status",
            "instance_status_description": "Version and backing service connectivity.",
            "login_title": "Admin sign in",
            "login_description": "Platform administrators only.",
            "login_email": "Email",
            "login_email_placeholder": "name@company.com",
            "login_password": "Password",
            "login_submit": "Sign in"
        },
        "groups": {
            "overview": "",
            "customers": "Customers",
            "channels": "Channels & system",
            "data": "Data",
            "content": "Content",
            "integrations": "Integrations",
            "config": "Configuration",
            "security": "Security",
            "tools": "Tools"
        },
        "nav": {
            "dashboard": "Overview",
            "accounts": "Accounts",
            "users": "Users",
            "channel_health": "Channel health",
            "instance_status": "Instance status",
            "alerts": "Alerts",
            "feature_usage": "Feature usage",
            "data": "Data browser",
            "sticker_packs": "Sticker library",
            "agent_bots": "Agent bots",
            "platform_apps": "Platform apps",
            "access_tokens": "Access tokens",
            "branding": "Branding",
            "app_config": "App config",
            "installation_configs": "Installation configs",
            "settings": "Settings",
            "audit_logs": "Audit log",
            "abuse_reports": "Abuse reports",
            "impersonations": "Impersonations",
            "horizon": "Queues (Horizon)",
            "pulse": "Performance (Pulse)",
            "logs": "Server logs",
            "dash": "dash.yona.vn"
        },
        "branding": {
            "page": {
                "title": "Branding",
                "description": "Logo, icon and favicon used across Yona: sign-in page, sidebar, public pages, widget, push notifications. Changes apply immediately, no deploy needed.",
                "upload": "Upload image",
                "replace": "Replace image",
                "uploading": "Uploading…",
                "reset": "Use default",
                "reset_confirm_title": "Revert to the default image?",
                "reset_confirm_description": "The uploaded image is deleted and every screen goes back to the default Yona file.",
                "using_custom": "Using uploaded image",
                "using_default": "Using default file",
                "preview_alt": "Preview of {name}"
            },
            "slots": {
                "logo": {
                    "title": "Logo",
                    "description": "Full logo on light backgrounds: sign-in page, home page, public pages."
                },
                "logo_dark": {
                    "title": "Logo for dark backgrounds",
                    "description": "Logo variant placed on dark backgrounds."
                },
                "logo_thumbnail": {
                    "title": "Icon",
                    "description": "Square compact logo: sidebar, widget, Help Center pages, push notification icon. Use a square image of 512 px or more."
                },
                "favicon": {
                    "title": "Favicon",
                    "description": "Browser tab icon. Use an ICO or square PNG of 32–64 px, or an SVG."
                }
            },
            "requirements": "Formats :formats, up to :size.",
            "unsafe_svg": "The SVG file contains scripts or unsafe links. Export the SVG again with shapes only.",
            "flash": {
                "updated": "Branding image updated.",
                "reset": "Reverted to the default image."
            }
        },
        "app_config": {
            "page_title": "App config",
            "page_description": "Integration keys and limits of this installation, grouped by service.",
            "default_value": "Default: {value}",
            "unset_value": "Not set",
            "sections": {
                "general": "General",
                "facebook": "Facebook",
                "shopify": "Shopify",
                "microsoft": "Microsoft",
                "email": "Email",
                "slack": "Slack",
                "instagram": "Instagram",
                "tiktok": "TikTok",
                "whatsapp_embedded": "WhatsApp Embedded",
                "google": "Google"
            },
            "section_titles": {
                "general": "General configuration"
            },
            "fields": {
                "WEBHOOK_TIMEOUT": {
                    "title": "Webhook request timeout (seconds)",
                    "description": "Maximum time Yona waits for a webhook response before failing the request"
                },
                "MAXIMUM_FILE_UPLOAD_SIZE": {
                    "title": "Attachment size limit (MB)",
                    "description": "Maximum attachment size in MB allowed for uploads"
                },
                "FIREBASE_PROJECT_ID": {
                    "title": "Firebase Project ID",
                    "description": "Firebase project ID"
                },
                "FIREBASE_CREDENTIALS": {
                    "title": "Firebase Credentials",
                    "description": "Contents on your firebase credentials json file"
                },
                "WIDGET_TOKEN_EXPIRY": {
                    "title": "Widget Token Expiry",
                    "description": "Token expiry in days"
                },
                "FB_APP_ID": {
                    "title": "Facebook App ID",
                    "description": ""
                },
                "FB_VERIFY_TOKEN": {
                    "title": "Facebook Verify Token",
                    "description": "The verify token used for Facebook Messenger Webhook"
                },
                "FB_APP_SECRET": {
                    "title": "Facebook App Secret",
                    "description": ""
                },
                "IG_VERIFY_TOKEN": {
                    "title": "Instagram Verify Token",
                    "description": "The verify token used for Instagram Webhook"
                },
                "FACEBOOK_API_VERSION": {
                    "title": "Facebook API Version",
                    "description": "Configure this if you want to use a different Facebook API version. Make sure its prefixed with `v`"
                },
                "SHOPIFY_CLIENT_ID": {
                    "title": "Shopify Client ID",
                    "description": "The Client ID (API Key) from your Shopify Partner account"
                },
                "SHOPIFY_CLIENT_SECRET": {
                    "title": "Shopify Client Secret",
                    "description": "The Client Secret (API Secret Key) from your Shopify Partner account"
                },
                "AZURE_APP_ID": {
                    "title": "Azure App ID",
                    "description": "The App ID that will be used to authenticate with customer Microsoft accounts."
                },
                "AZURE_APP_SECRET": {
                    "title": "Azure App Secret",
                    "description": ""
                },
                "MAILER_INBOUND_EMAIL_DOMAIN": {
                    "title": "Inbound Email Domain",
                    "description": "The domain name to be used for generating conversation continuity emails (reply+id@domain.com)"
                },
                "ACCOUNT_EMAILS_LIMIT": {
                    "title": "Account Email Sending Limit (Daily)",
                    "description": "Maximum number of non-channel emails an account can send per day"
                },
                "ACCOUNT_EMAILS_PLAN_LIMITS": {
                    "title": "Account Email Plan Limits (Daily)",
                    "description": "Per-plan daily email sending limits as JSON"
                },
                "SLACK_CLIENT_ID": {
                    "title": "Slack Client ID",
                    "description": "Slack client ID"
                },
                "SLACK_CLIENT_SECRET": {
                    "title": "Slack Client Secret",
                    "description": "Slack client secret"
                },
                "INSTAGRAM_APP_ID": {
                    "title": "Instagram App ID",
                    "description": ""
                },
                "INSTAGRAM_APP_SECRET": {
                    "title": "Instagram App Secret",
                    "description": "The App Secret used for Instagram authentication"
                },
                "INSTAGRAM_VERIFY_TOKEN": {
                    "title": "Instagram Verify Token",
                    "description": "The verify token used for Instagram Webhook"
                },
                "INSTAGRAM_API_VERSION": {
                    "title": "Instagram API Version",
                    "description": "Configure this if you want to use a different Instagram API version. Make sure its prefixed with `v`"
                },
                "TIKTOK_APP_ID": {
                    "title": "TikTok App ID",
                    "description": ""
                },
                "TIKTOK_APP_SECRET": {
                    "title": "TikTok App Secret",
                    "description": ""
                },
                "TIKTOK_API_VERSION": {
                    "title": "TikTok API Version",
                    "description": "Configure this if you want to use a different TikTok API version. Make sure its prefixed with `v`"
                },
                "WHATSAPP_APP_ID": {
                    "title": "WhatsApp App ID",
                    "description": "The Facebook App ID for WhatsApp Business API integration"
                },
                "WHATSAPP_APP_SECRET": {
                    "title": "WhatsApp App Secret",
                    "description": "The App Secret for WhatsApp Embedded Signup flow (required for embedded signup)"
                },
                "WHATSAPP_CONFIGURATION_ID": {
                    "title": "WhatsApp Configuration ID",
                    "description": "The Configuration ID for WhatsApp Embedded Signup flow (required for embedded signup)"
                },
                "WHATSAPP_API_VERSION": {
                    "title": "WhatsApp API Version",
                    "description": "Configure this if you want to use a different WhatsApp API version. Make sure its prefixed with `v`"
                },
                "GOOGLE_OAUTH_CLIENT_ID": {
                    "title": "Google OAuth Client ID",
                    "description": "Google OAuth Client ID for email authentication"
                },
                "GOOGLE_OAUTH_CLIENT_SECRET": {
                    "title": "Google OAuth Client Secret",
                    "description": "Google OAuth Client Secret for email authentication"
                },
                "GOOGLE_OAUTH_REDIRECT_URI": {
                    "title": "Google OAuth Redirect URI",
                    "description": "The redirect URI configured in your Google OAuth app"
                }
            }
        },
        "flash": {
            "created": "Record created.",
            "updated": "Changes saved.",
            "destroyed": "Record deleted.",
            "account_user_created": "User added to the account.",
            "account_user_destroyed": "User removed from the account.",
            "settings_updated": "Settings saved.",
            "restart_required": "Restart web and worker processes to apply this change everywhere."
        },
        "filters": {
            "active": "Active",
            "suspended": "Suspended",
            "confirmed": "Confirmed",
            "unconfirmed": "Unconfirmed",
            "recent": "Created in last 30 days",
            "marked_for_deletion": "Marked for deletion",
            "super_admin": "Super admins",
            "user": "Owned by users",
            "agent_bot": "Owned by agent bots",
            "platform_app": "Owned by platform apps",
            "churn_risk": "Churn risk (inactive 14 days)"
        },
        "attributes": {
            "id": "ID",
            "name": "Name",
            "display_name": "Display name",
            "email": "Email",
            "unconfirmed_email": "Unconfirmed email",
            "password": "Password",
            "avatar_url": "Avatar",
            "locale": "Locale",
            "status": "Status",
            "type": "Type",
            "role": "Role",
            "description": "Description",
            "outgoing_url": "Webhook URL",
            "access_token": "Access token",
            "token": "Token",
            "owner": "Owner",
            "account": "Account",
            "accounts": "Accounts",
            "account_users": "Account users",
            "user": "User",
            "users": "Members",
            "inviter": "Inviter",
            "inboxes": "Inboxes",
            "conversations": "Conversations",
            "custom_attributes": "Custom attributes",
            "value": "Value",
            "reason": "Reason",
            "ip_address": "IP address",
            "provider": "Provider",
            "uid": "UID",
            "pubsub_token": "Pubsub token",
            "confirmation_token": "Confirmation token",
            "confirmation_sent_at": "Confirmation sent at",
            "confirmed_at": "Confirmed at",
            "current_sign_in_at": "Current sign in at",
            "current_sign_in_ip": "Current sign-in IP",
            "last_sign_in_at": "Last sign in at",
            "last_sign_in_ip": "Last sign-in IP",
            "sign_in_count": "Sign in count",
            "suspension_category": "Suspension category",
            "suspension_reason": "Suspension reason",
            "suspension_history": "Suspension history",
            "used_at": "Used at",
            "created_at": "Created at",
            "updated_at": "Updated at"
        }
    },
    "ADMIN_OPERATIONS": {
        "NAV": {
            "CHANNEL_HEALTH": "Channel health",
            "FEATURE_USAGE": "Feature usage",
            "AUDIT_LOGS": "Audit log",
            "DATA": "System data"
        },
        "COMMON": {
            "OPEN_CALENDAR": "Open calendar",
            "PREVIOUS_MONTH": "Previous month",
            "NEXT_MONTH": "Next month",
            "WEEKDAYS": "Mo,Tu,We,Th,Fr,Sa,Su",
            "MONTH_YEAR": "{month}/{year}",
            "NEVER": "Never",
            "UNKNOWN": "Unknown",
            "APPLY": "Filter",
            "CLEAR": "Clear filters",
            "CANCEL": "Cancel",
            "BACK": "Back",
            "CONTINUE": "Continue",
            "PREVIOUS": "Previous page",
            "NEXT": "Next page",
            "PAGE": "Page {page}",
            "OPEN_ACCOUNT": "Open account"
        },
        "SUSPENSION": {
            "SUSPENDED": "Account :name suspended.",
            "UNSUSPENDED": "Account :name reactivated.",
            "BLOCKED": "This account is suspended. Please contact support."
        },
        "ACCOUNT_COLUMNS": {
            "messages_7d": "Messages 7d",
            "last_activity_at": "Last activity"
        },
        "SEARCH": {
            "SUSPENDED": "suspended"
        },
        "CHANNEL_HEALTH": {
            "TITLE": "Channel health",
            "DESCRIPTION": "Inboxes that lost their session, hit authentication errors or need to sign in again, across the whole system.",
            "STATS": {
                "TOTAL": "Total inboxes",
                "HEALTHY": "Healthy",
                "FAILING": "With problems",
                "ERRORS": "Not receiving"
            },
            "FILTERS": {
                "SEARCH": "Search inbox or account…",
                "ALL_PROBLEMS": "All problems",
                "ALL_PLATFORMS": "All channels",
                "PLATFORM": "Channel",
                "SEVERITY": "Severity",
                "ALL_SEVERITIES": "All severities"
            },
            "COLUMNS": {
                "INBOX": "Inbox",
                "ACCOUNT": "Account",
                "PROBLEM": "Problem",
                "SINCE": "Since",
                "DETAIL": "Detail"
            },
            "SEVERITY": {
                "error": "Down",
                "warning": "Warning"
            },
            "PROBLEMS": {
                "channel_missing": "Channel record missing",
                "session_lost": "Zalo session lost",
                "disconnected": "Zalo logged out",
                "awaiting_login": "Waiting for QR scan",
                "bridge_unreachable": "Zalo bridge unreachable",
                "circuit_open": "Repeated Zalo errors, paused",
                "reauthorization_required": "Sign-in required",
                "authorization_errors": "Authentication errors (IMAP/SMTP, token)"
            },
            "DETAIL_COUNT": "{count} errors",
            "EMPTY_TITLE": "All channels are healthy",
            "EMPTY_DESCRIPTION": "No inbox is having problems.",
            "NO_MATCH": "No inbox matches these filters."
        },
        "ACCOUNT_OVERVIEW": {
            "PAGE": {
                "TITLE": "Account profile",
                "DESCRIPTION": "Numbers, members, inboxes and activity of {name}."
            },
            "BACK": "Accounts",
            "STATUS": {
                "active": "Active",
                "suspended": "Suspended"
            },
            "CREATED_AT": "Created {date}",
            "LAST_ACTIVITY": "Last activity: {date}",
            "ACTIONS": {
                "LOCK": "Suspend account",
                "UNLOCK": "Reactivate",
                "IMPERSONATE": "Impersonate",
                "EDIT": "Edit",
                "RECORD": "View record",
                "AUDIT": "Audit log",
                "DATA": "Browse data"
            },
            "LOCK": {
                "TITLE": "Suspend this account?",
                "DESCRIPTION": "Agents, bots and the API of this account are blocked immediately; channels stop receiving new messages. Data is kept and you can reactivate at any time.",
                "CATEGORY": "Reason category",
                "REASON": "Reason",
                "REASON_HINT": "Up to {max} characters, kept in the suspension history.",
                "CONFIRM_TITLE": "Suspend \"{name}\" now?",
                "CONFIRM_DESCRIPTION": "No member can access the account until it is reactivated.",
                "CONFIRM": "Suspend now"
            },
            "UNLOCK": {
                "TITLE": "Reactivate \"{name}\"?",
                "DESCRIPTION": "Members can sign in again and channels resume receiving messages.",
                "CONFIRM": "Reactivate"
            },
            "IMPERSONATE": {
                "TITLE": "Impersonate",
                "DESCRIPTION": "Anything done after impersonating appears as done by this user. The reason is logged.",
                "USER": "User",
                "REASON": "Reason (at least {min} characters)",
                "SUBMIT": "Impersonate (new tab)",
                "NO_USERS": "This account has no members to impersonate."
            },
            "STATS": {
                "USERS": "Members",
                "INBOXES": "Inboxes",
                "CONVERSATIONS": "Conversations",
                "CONTACTS": "Contacts",
                "MESSAGES_7D": "Messages 7 days",
                "MESSAGES_30D": "Messages 30 days",
                "DAILY_AVERAGE": "Average {value} messages/day"
            },
            "TABS": {
                "OVERVIEW": "Overview",
                "USERS": "Members",
                "INBOXES": "Inboxes",
                "ACTIVITY": "Activity",
                "STICKERS": "Stickers"
            },
            "SECTIONS": {
                "USAGE": "Messages, last 30 days",
                "USAGE_TOTAL": "{count} messages",
                "ONBOARDING": "Activation progress",
                "INBOXES": "Inboxes and channel health",
                "USERS": "Members",
                "TIMELINE": "Recent activity",
                "SUSPENSIONS": "Suspension history",
                "IMPERSONATIONS": "Recent impersonations",
                "STICKERS": "Account sticker library",
                "FEATURES": "Features used"
            },
            "COLUMNS": {
                "NAME": "Name",
                "EMAIL": "Email",
                "ROLE": "Role",
                "LAST_SIGN_IN": "Last sign-in",
                "INBOX": "Inbox",
                "HEALTH": "Health",
                "SINCE": "Since",
                "ADMIN": "Admin",
                "TARGET": "Impersonated",
                "REASON": "Reason",
                "CATEGORY": "Category",
                "AT": "At"
            },
            "HEALTHY": "Healthy",
            "UNCONFIRMED": "Email not confirmed",
            "EMPTY": {
                "USERS": "No members yet.",
                "INBOXES": "No inbox connected yet.",
                "TIMELINE": "No activity yet.",
                "SUSPENSIONS": "Never suspended.",
                "IMPERSONATIONS": "No impersonation yet.",
                "FEATURES": "No feature used yet."
            },
            "FEATURES": {
                "COUNT": "{count} uses",
                "DESCRIPTION": "Counted from product events, admin actions on behalf of the account excluded.",
                "TIMES": ":count times"
            },
            "STICKERS": {
                "SUMMARY": "{packs} packs · {stickers} stickers",
                "MANAGE": "Manage sticker library",
                "DESCRIPTION": "Full control, same as the account administrator: create packs, upload, edit, reorder, publish, delete."
            },
            "ONBOARDING": {
                "CURRENT_STEP": "Current step: {step}",
                "DESCRIPTION": "The same six steps as the activation funnel on the Overview. Dates are when each step was first recorded, so they may not follow step order.",
                "DONE_COUNT": "{done}/{total} steps",
                "FINISHED": "Onboarding finished",
                "STEPS": {
                    "account_details": "Fill in account details",
                    "account_update": "Update account",
                    "invite_team": "Invite teammates"
                }
            },
            "AUDIT": {
                "BY": "By :admin",
                "FAILED_BY": "Failed (status :status), by :admin",
                "account_updated": {
                    "PACK": "Edited account details",
                    "NO_PACK": "Edited account details"
                },
                "account_deleted": {
                    "PACK": "Deleted the account",
                    "NO_PACK": "Deleted the account"
                },
                "cache_reset": {
                    "PACK": "Reset the account cache",
                    "NO_PACK": "Reset the account cache"
                },
                "unsuspended": {
                    "PACK": "Reactivated the account",
                    "NO_PACK": "Reactivated the account"
                },
                "pack_created": {
                    "PACK": "Created sticker pack “:pack”",
                    "NO_PACK": "Created a sticker pack"
                },
                "pack_updated": {
                    "PACK": "Edited sticker pack “:pack”",
                    "NO_PACK": "Edited a sticker pack"
                },
                "pack_deleted": {
                    "PACK": "Deleted sticker pack “:pack”",
                    "NO_PACK": "Deleted a sticker pack"
                },
                "pack_moved": {
                    "PACK": "Moved sticker pack “:pack” to the shared library",
                    "NO_PACK": "Moved a sticker pack to the shared library"
                },
                "pack_published": {
                    "PACK": "Published sticker pack “:pack”",
                    "NO_PACK": "Published a sticker pack"
                },
                "pack_unpublished": {
                    "PACK": "Unpublished sticker pack “:pack”",
                    "NO_PACK": "Unpublished a sticker pack"
                },
                "stickers_added": {
                    "PACK": "Added :count stickers to “:pack”",
                    "NO_PACK": "Added :count stickers to the account library"
                },
                "stickers_reordered": {
                    "PACK": "Reordered stickers in “:pack”",
                    "NO_PACK": "Reordered stickers in a pack"
                },
                "stickers_updated": {
                    "PACK": "Edited :count stickers in “:pack”",
                    "NO_PACK": "Edited :count stickers in the account library"
                },
                "stickers_deleted": {
                    "PACK": "Deleted :count stickers from “:pack”",
                    "NO_PACK": "Deleted :count stickers from the account library"
                },
                "other_change": {
                    "PACK": "Changed account data",
                    "NO_PACK": "Changed account data"
                },
                "other_delete": {
                    "PACK": "Deleted account data",
                    "NO_PACK": "Deleted account data"
                }
            },
            "TIMELINE": {
                "account_created": "Account “:name” created",
                "user_joined": ":name joined as :role",
                "inbox_created": "Inbox “:name” added",
                "suspended": "Suspended: :reason",
                "impersonated": ":admin impersonated :user",
                "admin_action": "Admin action",
                "last_message": "Latest message",
                "PRODUCT": {
                    "email_confirmed": "Email confirmed",
                    "onboarding_step_completed": "Onboarding step “:step” done",
                    "channel_connected": "Connected :platform: :method",
                    "first_inbound_message": "First customer message received via :platform",
                    "first_outbound_reply": "First reply sent via :platform",
                    "macro_run": "Ran a macro",
                    "automation_rule_created": "Created an automation rule",
                    "automation_rule_fired": "Automation rule ran",
                    "canned_response_used": "Used a canned response",
                    "campaign_created": "Created a campaign",
                    "help_center_article_published": "Published a Help Center article",
                    "sticker_sent": "Sent a sticker",
                    "sticker_uploaded": "Uploaded a sticker to the account library",
                    "structured_message_sent": "Sent a structured message",
                    "contacts_imported": "Imported contacts from CSV",
                    "contacts_exported": "Exported contacts to CSV",
                    "label_created": "Created a label",
                    "webhook_created": "Created a webhook",
                    "agent_bot_connected": "Connected an agent bot to an inbox"
                }
            }
        },
        "PRODUCT_EVENTS": {
            "NAMES": {
                "account_signed_up": "Account signed up",
                "email_confirmed": "Email confirmed",
                "onboarding_step_completed": "Onboarding step done",
                "inbox_created": "Inbox created",
                "channel_connected": "Channel connected",
                "first_inbound_message": "First customer message",
                "first_outbound_reply": "First reply",
                "macro_run": "Macro run",
                "automation_rule_created": "Automation rule created",
                "automation_rule_fired": "Automation rule ran",
                "canned_response_used": "Canned response used",
                "campaign_created": "Campaign created",
                "help_center_article_published": "Help Center article published",
                "sticker_sent": "Sticker sent",
                "sticker_uploaded": "Sticker uploaded",
                "structured_message_sent": "Structured message sent",
                "contacts_imported": "Contacts CSV import",
                "contacts_exported": "Contacts CSV export",
                "label_created": "Label created",
                "webhook_created": "Webhook created",
                "agent_bot_connected": "Agent bot connected"
            },
            "METHODS": {
                "token": "access token",
                "oauth": "platform sign-in",
                "qr": "QR scan",
                "imap": "IMAP fetch succeeded",
                "widget_embed": "widget running on the website"
            }
        },
        "FEATURE_USAGE": {
            "TITLE": "Feature usage",
            "DESCRIPTION": "How many accounts used each feature, counted from product events. Admin actions on behalf of an account are excluded.",
            "GROUPS": {
                "activation": "Activation milestones",
                "feature": "Features"
            },
            "COLUMNS": {
                "FEATURE": "Feature",
                "ACCOUNTS_7D": "Accounts 7 days",
                "ACCOUNTS_30D": "Accounts 30 days",
                "ACCOUNTS_90D": "Accounts 90 days",
                "ACCOUNTS_ALL": "Accounts all time",
                "EVENTS": "Total uses",
                "LAST": "Last used",
                "TREND": "30-day trend"
            },
            "ACCOUNTS_HINT": "Account columns count the accounts that used it in that window.",
            "UNUSED_TITLE": "Not used by any account yet ({count})",
            "TREND_SUMMARY": "{count} uses in 30 days",
            "OPEN": "See accounts using {feature}",
            "EMPTY_TITLE": "No events yet",
            "EMPTY_DESCRIPTION": "Run product-events:backfill to derive events from existing data.",
            "ACCOUNTS": {
                "TITLE": "Accounts using “{feature}”",
                "DESCRIPTION": "Most recent first, up to {limit} accounts.",
                "BACK": "Feature usage",
                "COLUMNS": {
                    "ACCOUNT": "Account",
                    "EVENTS": "Total uses",
                    "EVENTS_30D": "Uses 30d",
                    "FIRST": "First used",
                    "LAST": "Last used"
                },
                "EMPTY_TITLE": "No account uses it yet",
                "EMPTY_DESCRIPTION": "Accounts show up here once they use this feature."
            }
        },
        "AUDIT_LOGS": {
            "ACTIONS": {
                "suspended": "Suspend account",
                "account_created": "Create account",
                "member_added": "Add member to account",
                "member_removed": "Remove member from account",
                "user_created": "Create user",
                "user_updated": "Update user",
                "user_deleted": "Delete user",
                "avatar_deleted": "Delete avatar",
                "impersonated": "Impersonate user",
                "confirmation_resent": "Resend confirmation email",
                "agent_bot_created": "Create agent bot",
                "agent_bot_updated": "Update agent bot",
                "agent_bot_deleted": "Delete agent bot",
                "platform_app_created": "Create platform app",
                "platform_app_updated": "Update platform app",
                "platform_app_deleted": "Delete platform app",
                "access_token_created": "Create access token",
                "access_token_updated": "Update access token",
                "access_token_deleted": "Delete access token",
                "installation_config_created": "Create installation config",
                "installation_config_updated": "Update installation config",
                "alert_rule_updated": "Update alert rule",
                "alert_test_sent": "Send test alert",
                "push_subscribed": "Enable console push notifications",
                "push_unsubscribed": "Disable console push notifications",
                "installation_config_deleted": "Delete installation config",
                "app_config_saved": "Save app config",
                "layout_saved": "Save overview layout",
                "layout_reset": "Reset overview layout",
                "mfa_enabled": "Enable two-factor authentication",
                "mfa_verified": "Confirm two-factor authentication",
                "platform_pack_created": {
                    "PACK": "Create shared sticker pack “:pack”",
                    "NO_PACK": "Create a shared sticker pack"
                },
                "platform_pack_updated": {
                    "PACK": "Update shared sticker pack “:pack”",
                    "NO_PACK": "Update a shared sticker pack"
                },
                "platform_pack_deleted": {
                    "PACK": "Delete shared sticker pack “:pack”",
                    "NO_PACK": "Delete a shared sticker pack"
                },
                "platform_pack_published": {
                    "PACK": "Publish shared sticker pack “:pack”",
                    "NO_PACK": "Publish a shared sticker pack"
                },
                "platform_pack_unpublished": {
                    "PACK": "Unpublish shared sticker pack “:pack”",
                    "NO_PACK": "Unpublish a shared sticker pack"
                },
                "platform_stickers_added": {
                    "PACK": "Add :count stickers to “:pack”",
                    "NO_PACK": "Add :count stickers to the shared library"
                },
                "platform_stickers_reordered": {
                    "PACK": "Reorder stickers in “:pack”",
                    "NO_PACK": "Reorder stickers in the shared library"
                },
                "platform_stickers_updated": {
                    "PACK": "Update :count stickers in “:pack”",
                    "NO_PACK": "Update :count stickers in the shared library"
                },
                "platform_stickers_deleted": {
                    "PACK": "Delete :count stickers from “:pack”",
                    "NO_PACK": "Delete :count stickers from the shared library"
                }
            },
            "SUBJECTS": {
                "accounts": "Account",
                "account_users": "Member",
                "users": "User",
                "agent_bots": "Agent bot",
                "platform_apps": "Platform app",
                "access_tokens": "Access token",
                "installation_configs": "Installation config",
                "sticker_packs": "Shared sticker pack",
                "dashboard": "Overview",
                "app_config": "App config",
                "impersonations": "Impersonation",
                "mfa": "Two-factor authentication"
            },
            "RESULT": {
                "success": "Succeeded",
                "rejected": "Rejected",
                "failed": "Server error"
            },
            "RAW_ACTION": "Route",
            "HTTP_STATUS": "HTTP status",
            "IP_ADDRESS": "IP address",
            "USER_AGENT": "User agent",
            "TITLE": "Audit log",
            "DESCRIPTION": "Every write action by admins in the console. Passwords, tokens and verification codes are masked.",
            "FILTERS": {
                "ADMIN": "Admin",
                "ALL_ADMINS": "All admins",
                "ACTION": "Search actions…",
                "SUBJECT_TYPE": "Subject",
                "ALL_SUBJECTS": "All subjects",
                "SUBJECT_ID": "Subject ID",
                "FROM": "From",
                "FROM_SHORT": "From",
                "TO_SHORT": "To",
                "TO": "To"
            },
            "COLUMNS": {
                "TIME": "Time",
                "ADMIN": "Admin",
                "ACTION": "Action",
                "SUBJECT": "Subject",
                "STATUS": "Result"
            },
            "PAYLOAD": "Submitted data",
            "NO_PAYLOAD": "No submitted data.",
            "DELETED_ADMIN": "Deleted admin",
            "TOTAL": "{total} actions",
            "EMPTY_TITLE": "No actions yet",
            "EMPTY_DESCRIPTION": "Write actions in the console will show up here."
        },
        "DATA": {
            "TITLE": "System data",
            "DESCRIPTION": "Browse every table read-only. Secret columns (passwords, tokens, keys, OTP codes, encrypted fields) and customer message content are always masked.",
            "SEARCH_TABLES": "Filter tables…",
            "COLUMNS": {
                "TABLE": "Table",
                "ROWS": "Rows",
                "SIZE": "Size"
            },
            "APPROXIMATE": "estimate",
            "NO_TABLES": "No table found.",
            "BACK": "All tables",
            "READ_ONLY": "Read-only",
            "MASKED_SECRET": "Masked: secret data",
            "MASKED_PERSONAL": "Masked: customer content (Decree 13)",
            "FILTERS": "Filter by column",
            "FILTER_HINT": "Numeric columns match exactly, text columns match partially, type null to find empty cells. Masked columns cannot be filtered.",
            "SORT": "Sort by {column}",
            "EMPTY": "No rows.",
            "ROWS_ON_PAGE": "{count} rows on this page",
            "TABLE_TITLE": "Table {table}",
            "SCROLL_HINT": "{count} columns, scroll sideways to see all",
            "PIN": {
                "LEFT": "Stick to left",
                "RIGHT": "Stick to right",
                "UNPIN": "Unpin {column} column",
                "OPTIONS": "Pin options for {column} column"
            }
        },
        "STICKERS": {
            "PLATFORM_TAB": "Shared library",
            "ACCOUNT_TAB": "Account library",
            "ACCOUNT_TITLE": "Sticker library of {name}",
            "ACCOUNT_DESCRIPTION": "Full control, same as the account administrator: create packs, upload, edit, reorder, publish, delete, move packs to the shared library.",
            "PICK_ACCOUNT": "Find an account by name or ID…",
            "PICK_ACCOUNT_TITLE": "Pick an account",
            "PICK_ACCOUNT_HINT": "An account library is only available to that account. Search by name or ID to open it.",
            "NO_ACCOUNTS": "No account found.",
            "BACK_TO_ACCOUNT": "Back to account"
        }
    },
    "AGENT_BOTS": {
        "HEADER": "Bots",
        "LOADING_EDITOR": "Loading editor...",
        "DESCRIPTION": "Agent Bots are like the most fabulous members of your team. They can handle the small stuff, so you can focus on the stuff that matters. Give them a try. You can manage your bots from this page or create new ones using the 'Add Bot' button.",
        "LEARN_MORE": "Learn about agent bots",
        "COUNT": "{n} bot | {n} bots",
        "SEARCH_PLACEHOLDER": "Search bots...",
        "NO_RESULTS": "No bots found matching your search",
        "GLOBAL_BOT": "System bot",
        "GLOBAL_BOT_BADGE": "System",
        "AVATAR": {
            "SUCCESS_DELETE": "Bot avatar deleted successfully",
            "ERROR_DELETE": "Error deleting bot avatar, please try again"
        },
        "BOT_CONFIGURATION": {
            "TITLE": "Select an agent bot",
            "DESC": "Assign an Agent Bot to your inbox. They can handle initial conversations and transfer them to a live agent when necessary.",
            "SUBMIT": "Update",
            "DISCONNECT": "Disconnect bot",
            "SUCCESS_MESSAGE": "Successfully updated the agent bot.",
            "DISCONNECTED_SUCCESS_MESSAGE": "Successfully disconnected the agent bot.",
            "ERROR_MESSAGE": "Could not update the agent bot. Please try again.",
            "DISCONNECTED_ERROR_MESSAGE": "Could not disconnect the agent bot. Please try again.",
            "SELECT_PLACEHOLDER": "Select bot"
        },
        "ADD": {
            "TITLE": "Add Bot",
            "CANCEL_BUTTON_TEXT": "Cancel",
            "API": {
                "SUCCESS_MESSAGE": "Bot added successfully.",
                "ERROR_MESSAGE": "Could not add bot. Please try again later."
            }
        },
        "LIST": {
            "404": "No bots found. You can create a bot by clicking the 'Add Bot' button.",
            "LOADING": "Fetching bots...",
            "TABLE_HEADER": {
                "DETAILS": "Bot Details",
                "URL": "Webhook URL",
                "ACTIONS": "Actions"
            }
        },
        "DELETE": {
            "BUTTON_TEXT": "Delete",
            "TITLE": "Delete bot",
            "CONFIRM": {
                "TITLE": "Confirm Deletion",
                "MESSAGE": "Are you sure you want to delete {name}?",
                "YES": "Yes, Delete",
                "NO": "No, Keep"
            },
            "API": {
                "SUCCESS_MESSAGE": "Bot deleted successfully.",
                "ERROR_MESSAGE": "Could not delete bot. Please try again."
            }
        },
        "EDIT": {
            "BUTTON_TEXT": "Edit",
            "TITLE": "Edit bot",
            "API": {
                "SUCCESS_MESSAGE": "Bot updated successfully.",
                "ERROR_MESSAGE": "Could not update bot. Please try again."
            }
        },
        "SECRET": {
            "LABEL": "Webhook Secret",
            "COPY": "Copy secret to clipboard",
            "COPY_SUCCESS": "Secret copied to clipboard",
            "TOGGLE": "Toggle secret visibility",
            "CREATED_DESC": "Use the secret below to verify webhook signatures. Please copy it now, you can also find it later in the bot settings.",
            "DONE": "Done",
            "RESET_SUCCESS": "Webhook secret regenerated successfully",
            "RESET_ERROR": "Unable to regenerate webhook secret. Please try again"
        },
        "ACCESS_TOKEN": {
            "TITLE": "Access Token",
            "DESCRIPTION": "Copy the access token and save it securely",
            "COPY_SUCCESSFUL": "Access token copied to clipboard",
            "RESET_SUCCESS": "Access token regenerated successfully",
            "RESET_ERROR": "Unable to regenerate access token. Please try again"
        },
        "FORM": {
            "AVATAR": {
                "LABEL": "Bot avatar"
            },
            "NAME": {
                "LABEL": "Bot name",
                "PLACEHOLDER": "Enter bot name",
                "REQUIRED": "Bot name is required"
            },
            "DESCRIPTION": {
                "LABEL": "Description",
                "PLACEHOLDER": "What does this bot do?"
            },
            "WEBHOOK_URL": {
                "LABEL": "Webhook URL",
                "PLACEHOLDER": "https://example.com/webhook",
                "REQUIRED": "Webhook URL is required"
            },
            "ERRORS": {
                "NAME": "Bot name is required",
                "URL": "Webhook URL is required",
                "VALID_URL": "Please enter a valid URL starting with http:// or https://"
            },
            "CANCEL": "Cancel",
            "CREATE": "Create Bot",
            "UPDATE": "Update Bot"
        },
        "WEBHOOK": {
            "DESCRIPTION": "Configure a webhook bot to integrate with your custom services. The bot will receive and process events from conversations and can respond to them."
        },
        "TYPES": {
            "WEBHOOK": "Webhook bot"
        }
    },
    "AGENT_MGMT": {
        "HEADER": "Agents",
        "HEADER_BTN_TXT": "Add Agent",
        "LOADING": "Fetching Agent List",
        "DESCRIPTION": "An agent is a member of your customer support team who can view and respond to user messages. The list below shows all the agents in your account.",
        "LEARN_MORE": "Learn about user roles",
        "AGENT_TYPES": {
            "ADMINISTRATOR": "Administrator",
            "AGENT": "Agent"
        },
        "COUNT": "{n} agent | {n} agents",
        "LIST": {
            "404": "There are no agents associated to this account",
            "TITLE": "Manage agents in your team",
            "DESC": "You can add/remove agents to/in your team.",
            "NAME": "Name",
            "EMAIL": "EMAIL",
            "STATUS": "Status",
            "ACTIONS": "Actions",
            "VERIFIED": "Verified",
            "VERIFICATION_PENDING": "Verification Pending",
            "AVAILABLE_CUSTOM_ROLE": "Available custom role permissions"
        },
        "ADD": {
            "TITLE": "Add agent to your team",
            "DESC": "You can add people who will be able to handle support for your inboxes.",
            "CANCEL_BUTTON_TEXT": "Cancel",
            "FORM": {
                "NAME": {
                    "LABEL": "Agent Name",
                    "PLACEHOLDER": "Please enter a name of the agent"
                },
                "AGENT_TYPE": {
                    "LABEL": "Role",
                    "PLACEHOLDER": "Please select a role",
                    "ERROR": "Role is required"
                },
                "EMAIL": {
                    "LABEL": "Email Address",
                    "PLACEHOLDER": "Please enter an email address of the agent"
                },
                "SUBMIT": "Add Agent"
            },
            "API": {
                "SUCCESS_MESSAGE": "Agent added successfully",
                "EXIST_MESSAGE": "Agent email already in use, Please try another email address",
                "ERROR_MESSAGE": "Could not connect to the server. Please try again later."
            }
        },
        "DELETE": {
            "BUTTON_TEXT": "Delete",
            "API": {
                "SUCCESS_MESSAGE": "Agent deleted successfully",
                "ERROR_MESSAGE": "Could not connect to the server. Please try again later."
            },
            "CONFIRM": {
                "TITLE": "Confirm Deletion",
                "MESSAGE": "Are you sure to delete ",
                "YES": "Yes, Delete ",
                "NO": "No, Keep "
            }
        },
        "EDIT": {
            "TITLE": "Edit agent",
            "FORM": {
                "NAME": {
                    "LABEL": "Agent Name",
                    "PLACEHOLDER": "Please enter a name of the agent"
                },
                "AGENT_TYPE": {
                    "LABEL": "Role",
                    "PLACEHOLDER": "Please select a role",
                    "ERROR": "Role is required"
                },
                "EMAIL": {
                    "LABEL": "Email Address",
                    "PLACEHOLDER": "Please enter an email address of the agent"
                },
                "AGENT_AVAILABILITY": {
                    "LABEL": "Availability",
                    "PLACEHOLDER": "Please select an availability status",
                    "ERROR": "Availability is required"
                },
                "SUBMIT": "Edit Agent"
            },
            "BUTTON_TEXT": "Edit",
            "CANCEL_BUTTON_TEXT": "Cancel",
            "API": {
                "SUCCESS_MESSAGE": "Agent updated successfully",
                "ERROR_MESSAGE": "Could not connect to the server. Please try again later."
            },
            "PASSWORD_RESET": {
                "ADMIN_RESET_BUTTON": "Reset Password",
                "ADMIN_SUCCESS_MESSAGE": "An email with reset password instructions has been sent to the agent",
                "SUCCESS_MESSAGE": "Agent password reset successfully",
                "ERROR_MESSAGE": "Could not connect to the server. Please try again later."
            }
        },
        "SEARCH_PLACEHOLDER": "Search agents...",
        "NO_RESULTS": "No agents found matching your search",
        "SEARCH": {
            "NO_RESULTS": "No results found."
        },
        "MULTI_SELECTOR": {
            "PLACEHOLDER": "None",
            "TITLE": {
                "AGENT": "Select agent",
                "TEAM": "Select team"
            },
            "LIST": {
                "NONE": "None"
            },
            "SEARCH": {
                "NO_RESULTS": {
                    "AGENT": "No agents found",
                    "TEAM": "No teams found"
                },
                "PLACEHOLDER": {
                    "AGENT": "Search agents",
                    "TEAM": "Search teams",
                    "INPUT": "Search for agents"
                }
            }
        }
    },
    "AGENT_REPORTS": {
        "HEADER": "Agents Overview",
        "DESCRIPTION": "Easily track agent performance with key metrics such as conversations, response times, resolution times, and resolved cases. Click an agent's name to learn more.",
        "LOADING_CHART": "Loading chart data...",
        "NO_ENOUGH_DATA": "We've not received enough data points to generate report, Please try again later.",
        "DOWNLOAD_AGENT_REPORTS": "Download agent reports",
        "FILTER_DROPDOWN_LABEL": "Select Agent",
        "FILTERS": {
            "INPUT_PLACEHOLDER": {
                "AGENTS": "Search agents"
            }
        },
        "METRICS": {
            "CONVERSATIONS": {
                "NAME": "Conversations",
                "DESC": "( Total )"
            },
            "INCOMING_MESSAGES": {
                "NAME": "Incoming Messages",
                "DESC": "( Total )"
            },
            "OUTGOING_MESSAGES": {
                "NAME": "Outgoing Messages",
                "DESC": "( Total )"
            },
            "FIRST_RESPONSE_TIME": {
                "NAME": "First Response Time",
                "DESC": "( Avg )",
                "INFO_TEXT": "Total number of conversations used for computation:",
                "TOOLTIP_TEXT": "First Response Time is {metricValue} (based on {conversationCount} conversations)"
            },
            "RESOLUTION_TIME": {
                "NAME": "Resolution Time",
                "DESC": "( Avg )",
                "INFO_TEXT": "Total number of conversations used for computation:",
                "TOOLTIP_TEXT": "Resolution Time is {metricValue} (based on {conversationCount} conversations)"
            },
            "RESOLUTION_COUNT": {
                "NAME": "Resolution Count",
                "DESC": "( Total )"
            }
        },
        "CUSTOM_DATE_RANGE": {
            "CONFIRM": "Apply",
            "PLACEHOLDER": "Select date range"
        }
    },
    "ALERT_SOUND": {
        "TONE_LABEL": "Sound",
        "PREVIEW": "Preview",
        "TONES": {
            "DING": "Ding",
            "BELL": "Bell",
            "CHIME": "Chime",
            "DRUMROLL": "Drumroll",
            "MAGIC": "Magic",
            "PING": "Ping",
            "RINGTONE": "Ringtone"
        }
    },
    "APP_GLOBAL": {
        "TRIAL_MESSAGE": "days trial remaining.",
        "TRAIL_BUTTON": "Buy Now",
        "DELETED_USER": "Deleted User",
        "EMAIL_VERIFICATION_PENDING": "It seems that you haven't verified your email address yet. Please check your inbox for the verification email.",
        "RESEND_VERIFICATION_MAIL": "Resend verification email",
        "EMAIL_VERIFICATION_SENT": "Verification email has been sent. Please check your inbox.",
        "ACCOUNT_SUSPENDED": {
            "TITLE": "Account Suspended",
            "MESSAGE": "Your account has been suspended due to activity that may violate our policies. If you believe this is a mistake, please contact our support team.",
            "MANAGE_BILLING": "Manage billing"
        },
        "NO_ACCOUNTS": {
            "TITLE": "No account found",
            "MESSAGE_CLOUD": "You are not part of any accounts right now. If you think this is a mistake, please reach out to our support team.",
            "MESSAGE_SELF_HOSTED": "You are not part of any accounts right now. Please reach out to your administrator.",
            "LOGOUT": "Log out"
        },
        "PLACEHOLDER": {
            "TITLE": "This page is not ready yet",
            "TITLE_NAMED": "{name} is not ready yet",
            "DESCRIPTION": "We will open it as soon as it is done.",
            "BACK": "Back to conversations"
        }
    },
    "ASSIGNMENT_POLICY": {
        "INDEX": {
            "HEADER": {
                "TITLE": "Agent assignment",
                "DESCRIPTION": "Define policies to effectively manage workload and route conversations based on the needs of inboxes and agents. Learn more here"
            },
            "ASSIGNMENT_POLICY": {
                "TITLE": "Assignment policy",
                "DESCRIPTION": "Manage how conversations get assigned in inboxes.",
                "FEATURES": [
                    "Assign by conversations evenly or by available capacity",
                    "Add fair distribution rules to avoid overloading any agent",
                    "Add inboxes to a policy - one policy per inbox"
                ]
            },
            "AGENT_CAPACITY_POLICY": {
                "TITLE": "Agent capacity policy",
                "DESCRIPTION": "Manage workload for agents.",
                "FEATURES": [
                    "Define maximum conversations per inbox",
                    "Create exceptions based on labels and time",
                    "Add agents to a policy - one policy per agent"
                ]
            }
        },
        "AGENT_ASSIGNMENT_POLICY": {
            "INDEX": {
                "HEADER": {
                    "TITLE": "Assignment policy",
                    "CREATE_POLICY": "New policy"
                },
                "CARD": {
                    "ORDER": "Order",
                    "PRIORITY": "Priority",
                    "ACTIVE": "Active",
                    "INACTIVE": "Inactive",
                    "POPOVER": "Added inboxes",
                    "EDIT": "Edit"
                },
                "NO_RECORDS_FOUND": "No assignment policies found"
            },
            "CREATE": {
                "HEADER": {
                    "TITLE": "Create assignment policy"
                },
                "CREATE_BUTTON": "Create policy",
                "API": {
                    "SUCCESS_MESSAGE": "Assignment policy created successfully",
                    "ERROR_MESSAGE": "Failed to create assignment policy",
                    "INBOX_LINKED": "Inbox has been linked to the policy"
                }
            },
            "EDIT": {
                "HEADER": {
                    "TITLE": "Edit assignment policy"
                },
                "EDIT_BUTTON": "Update policy",
                "CONFIRM_ADD_INBOX_DIALOG": {
                    "TITLE": "Add inbox",
                    "DESCRIPTION": "{inboxName} inbox is already linked to another policy. Are you sure you want to link it to this policy? It will be unlinked from the other policy.",
                    "CONFIRM_BUTTON_LABEL": "Continue",
                    "CANCEL_BUTTON_LABEL": "Cancel"
                },
                "INBOX_LINK_PROMPT": {
                    "TITLE": "Link inbox to policy",
                    "DESCRIPTION": "Would you like to link this inbox to the assignment policy?",
                    "LINK_BUTTON": "Link inbox",
                    "CANCEL_BUTTON": "Skip"
                },
                "API": {
                    "SUCCESS_MESSAGE": "Assignment policy updated successfully",
                    "ERROR_MESSAGE": "Failed to update assignment policy"
                },
                "INBOX_API": {
                    "ADD": {
                        "SUCCESS_MESSAGE": "Inbox added to policy successfully",
                        "ERROR_MESSAGE": "Failed to add inbox to policy"
                    },
                    "REMOVE": {
                        "SUCCESS_MESSAGE": "Inbox removed from policy successfully",
                        "ERROR_MESSAGE": "Failed to remove inbox from policy"
                    }
                }
            },
            "FORM": {
                "NAME": {
                    "LABEL": "Policy name:",
                    "PLACEHOLDER": "Enter policy name"
                },
                "DESCRIPTION": {
                    "LABEL": "Description:",
                    "PLACEHOLDER": "Enter description"
                },
                "STATUS": {
                    "LABEL": "Status:",
                    "PLACEHOLDER": "Select status",
                    "ACTIVE": "Policy is active",
                    "INACTIVE": "Policy is inactive"
                },
                "ASSIGNMENT_ORDER": {
                    "LABEL": "Assignment order",
                    "ROUND_ROBIN": {
                        "LABEL": "Round robin",
                        "DESCRIPTION": "Assign conversations evenly among agents."
                    },
                    "BALANCED": {
                        "LABEL": "Balanced",
                        "DESCRIPTION": "Assign conversations based on available capacity.",
                        "PREMIUM_MESSAGE": "Upgrade to access balanced assignment and agent capacity management.",
                        "PREMIUM_BADGE": "Premium"
                    }
                },
                "ASSIGNMENT_PRIORITY": {
                    "LABEL": "Assignment priority",
                    "EARLIEST_CREATED": {
                        "LABEL": "Earliest created",
                        "DESCRIPTION": "The conversation that was created first gets assigned first."
                    },
                    "LONGEST_WAITING": {
                        "LABEL": "Longest waiting",
                        "DESCRIPTION": "The conversation waiting the longest gets assigned first."
                    }
                },
                "FAIR_DISTRIBUTION": {
                    "LABEL": "Fair distribution policy",
                    "DESCRIPTION": "Cap conversations per agent within a time window to avoid overload. Defaults to 100 per hour.",
                    "INPUT_MAX": "Assign max",
                    "DURATION": "Conversations per agent in every"
                },
                "EXCLUDE_OLDER_THAN": {
                    "LABEL": "Skip stale conversations",
                    "DESCRIPTION": "Skip unassigned conversations older than this. Defaults to 7 days; clear to disable."
                },
                "INBOXES": {
                    "LABEL": "Added inboxes",
                    "DESCRIPTION": "Add inboxes for which this policy will be applicable.",
                    "ADD_BUTTON": "Add inbox",
                    "DROPDOWN": {
                        "SEARCH_PLACEHOLDER": "Search and select inboxes to add",
                        "ADD_BUTTON": "Add"
                    },
                    "EMPTY_STATE": "No inboxes added to this policy, add an inbox to get started",
                    "API": {
                        "SUCCESS_MESSAGE": "Inbox successfully added to policy",
                        "ERROR_MESSAGE": "Failed to add inbox to policy"
                    }
                }
            },
            "DELETE_POLICY": {
                "SUCCESS_MESSAGE": "Assignment policy deleted successfully",
                "ERROR_MESSAGE": "Failed to delete assignment policy"
            }
        },
        "AGENT_CAPACITY_POLICY": {
            "INDEX": {
                "HEADER": {
                    "TITLE": "Agent capacity",
                    "CREATE_POLICY": "New policy"
                },
                "CARD": {
                    "POPOVER": "Added agents",
                    "EDIT": "Edit"
                },
                "NO_RECORDS_FOUND": "No agent capacity policies found"
            },
            "CREATE": {
                "HEADER": {
                    "TITLE": "Create agent capacity policy"
                },
                "CREATE_BUTTON": "Create policy",
                "API": {
                    "SUCCESS_MESSAGE": "Agent capacity policy created successfully",
                    "ERROR_MESSAGE": "Failed to create agent capacity policy"
                }
            },
            "EDIT": {
                "HEADER": {
                    "TITLE": "Edit agent capacity policy"
                },
                "EDIT_BUTTON": "Update policy",
                "CONFIRM_ADD_AGENT_DIALOG": {
                    "TITLE": "Add agent",
                    "DESCRIPTION": "{agentName} is already linked to another policy. Are you sure you want to link it to this policy? It will be unlinked from the other policy.",
                    "CONFIRM_BUTTON_LABEL": "Continue",
                    "CANCEL_BUTTON_LABEL": "Cancel"
                },
                "API": {
                    "SUCCESS_MESSAGE": "Agent capacity policy updated successfully",
                    "ERROR_MESSAGE": "Failed to update agent capacity policy"
                },
                "AGENT_API": {
                    "ADD": {
                        "SUCCESS_MESSAGE": "Agent added to policy successfully",
                        "ERROR_MESSAGE": "Failed to add agent to policy"
                    },
                    "REMOVE": {
                        "SUCCESS_MESSAGE": "Agent removed from policy successfully",
                        "ERROR_MESSAGE": "Failed to remove agent from policy"
                    }
                },
                "INBOX_LIMIT_API": {
                    "ADD": {
                        "SUCCESS_MESSAGE": "Inbox limit added successfully",
                        "ERROR_MESSAGE": "Failed to add inbox limit"
                    },
                    "UPDATE": {
                        "SUCCESS_MESSAGE": "Inbox limit updated successfully",
                        "ERROR_MESSAGE": "Failed to update inbox limit"
                    },
                    "DELETE": {
                        "SUCCESS_MESSAGE": "Inbox limit deleted successfully",
                        "ERROR_MESSAGE": "Failed to delete inbox limit"
                    }
                }
            },
            "FORM": {
                "NAME": {
                    "LABEL": "Policy name:",
                    "PLACEHOLDER": "Enter policy name"
                },
                "DESCRIPTION": {
                    "LABEL": "Description:",
                    "PLACEHOLDER": "Enter description"
                },
                "INBOX_CAPACITY_LIMIT": {
                    "LABEL": "Inbox capacity limits",
                    "ADD_BUTTON": "Add inbox",
                    "FIELD": {
                        "SELECT_INBOX": "Select inbox",
                        "MAX_CONVERSATIONS": "Max conversations",
                        "SET_LIMIT": "Set limit"
                    },
                    "EMPTY_STATE": "No inbox limit set"
                },
                "EXCLUSION_RULES": {
                    "LABEL": "Exclusion rules",
                    "DESCRIPTION": "Conversations that satisfy the following conditions would not count towards agent capacity",
                    "TAGS": {
                        "LABEL": "Exclude conversations tagged with specific labels",
                        "ADD_TAG": "add tag",
                        "DROPDOWN": {
                            "SEARCH_PLACEHOLDER": "Search and select tags to add"
                        },
                        "EMPTY_STATE": "No tags added to this policy."
                    },
                    "DURATION": {
                        "LABEL": "Exclude conversations older than a specified duration",
                        "PLACEHOLDER": "Set time"
                    }
                },
                "USERS": {
                    "LABEL": "Assigned agents",
                    "DESCRIPTION": "Add agents for which this policy will be applicable.",
                    "ADD_BUTTON": "Add agent",
                    "DROPDOWN": {
                        "SEARCH_PLACEHOLDER": "Search and select agents to add",
                        "ADD_BUTTON": "Add"
                    },
                    "EMPTY_STATE": "No agents added",
                    "API": {
                        "SUCCESS_MESSAGE": "Agent successfully added to policy",
                        "ERROR_MESSAGE": "Failed to add agent to policy"
                    }
                }
            },
            "DELETE_POLICY": {
                "SUCCESS_MESSAGE": "Agent capacity policy deleted successfully",
                "ERROR_MESSAGE": "Failed to delete agent capacity policy"
            }
        },
        "DELETE_POLICY": {
            "TITLE": "Delete policy",
            "DESCRIPTION": "Are you sure you want to delete this policy? This action cannot be undone.",
            "CONFIRM_BUTTON_LABEL": "Delete",
            "CANCEL_BUTTON_LABEL": "Cancel"
        }
    },
    "ATTRIBUTES_MGMT": {
        "HEADER": "Custom Attributes",
        "HEADER_BTN_TXT": "Add Custom Attribute",
        "LOADING": "Fetching custom attributes",
        "DESCRIPTION": "A custom attribute tracks additional details about your contacts, companies, or conversations—such as the subscription plan or the date of their first purchase. You can add different types of custom attributes, such as text, lists, or numbers, to capture the specific information you need.",
        "LEARN_MORE": "Learn more about custom attributes",
        "COUNT": "{n} attribute | {n} attributes",
        "SEARCH_PLACEHOLDER": "Search attributes...",
        "NO_RESULTS": "No attributes found matching your search",
        "ATTRIBUTE_MODELS": {
            "CONVERSATION": "Conversation",
            "CONTACT": "Contact",
            "COMPANY": "Company"
        },
        "ATTRIBUTE_TYPES": {
            "TEXT": "Text",
            "NUMBER": "Number",
            "LINK": "Link",
            "DATE": "Date",
            "LIST": "List",
            "CHECKBOX": "Checkbox"
        },
        "ADD": {
            "TITLE": "Add Custom Attribute",
            "SUBMIT": "Create",
            "CANCEL_BUTTON_TEXT": "Cancel",
            "FORM": {
                "NAME": {
                    "LABEL": "Display Name",
                    "PLACEHOLDER": "Enter custom attribute display name",
                    "ERROR": "Name is required"
                },
                "DESC": {
                    "LABEL": "Description",
                    "PLACEHOLDER": "Enter custom attribute description",
                    "ERROR": "Description is required"
                },
                "MODEL": {
                    "LABEL": "Applies to",
                    "PLACEHOLDER": "Please select one",
                    "ERROR": "Model is required"
                },
                "TYPE": {
                    "LABEL": "Type",
                    "PLACEHOLDER": "Please select a type",
                    "ERROR": "Type is required",
                    "LIST": {
                        "LABEL": "List Values",
                        "PLACEHOLDER": "Please enter value and press enter key",
                        "ERROR": "Must have at least one value"
                    }
                },
                "KEY": {
                    "LABEL": "Key",
                    "PLACEHOLDER": "Enter custom attribute key",
                    "ERROR": "Key is required",
                    "IN_VALID": "Invalid key"
                },
                "REGEX_PATTERN": {
                    "LABEL": "Regex Pattern",
                    "PLACEHOLDER": "Please enter custom attribute regex pattern. (Optional)"
                },
                "REGEX_CUE": {
                    "LABEL": "Regex Cue",
                    "PLACEHOLDER": "Please enter regex pattern hint. (Optional)"
                },
                "ENABLE_REGEX": {
                    "LABEL": "Enable regex validation"
                },
                "BADGES": {
                    "PRE_CHAT": "Pre-chat",
                    "RESOLUTION": "Resolution"
                }
            },
            "API": {
                "SUCCESS_MESSAGE": "Custom Attribute added successfully!",
                "ERROR_MESSAGE": "Could not create a Custom Attribute. Please try again later."
            }
        },
        "DELETE": {
            "BUTTON_TEXT": "Delete",
            "API": {
                "SUCCESS_MESSAGE": "Custom Attribute deleted successfully.",
                "ERROR_MESSAGE": "Couldn't delete the custom attribute. Try again."
            },
            "CONFIRM": {
                "TITLE": "Are you sure want to delete - {attributeName}",
                "PLACE_HOLDER": "Please type {attributeName} to confirm",
                "MESSAGE": "Deleting will remove the custom attribute",
                "YES": "Delete ",
                "NO": "Cancel"
            }
        },
        "EDIT": {
            "TITLE": "Edit Custom Attribute",
            "UPDATE_BUTTON_TEXT": "Update",
            "TYPE": {
                "LIST": {
                    "LABEL": "List Values",
                    "PLACEHOLDER": "Please enter values and press enter key"
                }
            },
            "API": {
                "SUCCESS_MESSAGE": "Custom Attribute updated successfully",
                "ERROR_MESSAGE": "There was an error updating custom attribute, please try again"
            }
        },
        "TABS": {
            "HEADER": "Custom Attributes",
            "CONVERSATION": "Conversation",
            "CONTACT": "Contact",
            "COMPANY": "Company"
        },
        "LIST": {
            "TABLE_HEADER": {
                "NAME": "Name",
                "DESCRIPTION": "Description",
                "TYPE": "Type",
                "KEY": "Key"
            },
            "BUTTONS": {
                "EDIT": "Edit",
                "DELETE": "Delete"
            },
            "EMPTY_RESULT": {
                "404": "There are no custom attributes created",
                "NOT_FOUND": "There are no custom attributes configured"
            },
            "REGEX_PATTERN": {
                "LABEL": "Regex Pattern",
                "PLACEHOLDER": "Please enter custom attribute regex pattern. (Optional)"
            },
            "REGEX_CUE": {
                "LABEL": "Regex Cue",
                "PLACEHOLDER": "Please enter regex pattern hint. (Optional)"
            },
            "ENABLE_REGEX": {
                "LABEL": "Enable regex validation"
            }
        },
        "BADGES": {
            "PRE_CHAT": "Pre-chat",
            "RESOLUTION": "Resolution"
        }
    },
    "AUTH": {
        "failed": "Invalid login credentials. Please try again.",
        "unconfirmed": "You have to confirm your email address before continuing. Please confirm your email :email.",
        "throttle": "Too many login attempts. Please try again in :seconds seconds.",
        "page_expired": "This page has expired. Please try again.",
        "signup": {
            "invalid_email": "Please enter a valid email address.",
            "user_exists": "A user with this email address already exists.",
            "failed": "Could not create the account. Please try again."
        },
        "oauth": {
            "failed": "Could not sign you in. Please try again.",
            "unverified_email": "This email address has not been verified by the provider, so it cannot be used to sign in.",
            "not_allowed": "This account cannot sign in this way. Please sign in with your password."
        }
    },
    "AUTO_ASSIGNMENT": {
        "default_policy_name": "Default Policy",
        "policy_actor": "Automation System via {policy_name}"
    },
    "AUTOMATION": {
        "system_name": "Automation System",
        "HEADER": "Automation",
        "DESCRIPTION": "Automation can replace and streamline existing processes that require manual effort, such as adding labels and assigning conversations to the most suitable agent. This allows the team to focus on their strengths while reducing time spent on routine tasks.",
        "LEARN_MORE": "Learn more about automation",
        "COUNT": "{n} automation | {n} automations",
        "HEADER_BTN_TXT": "Create Automation",
        "LOADING": "Fetching automation rules",
        "SEARCH_PLACEHOLDER": "Search automation rules...",
        "NO_RESULTS": "No automation rules found matching your search",
        "ADD": {
            "TITLE": "Add Automation Rule",
            "SUBMIT": "Create",
            "CANCEL_BUTTON_TEXT": "Cancel",
            "FORM": {
                "NAME": {
                    "LABEL": "Rule Name",
                    "PLACEHOLDER": "Enter rule name",
                    "ERROR": "Name is required"
                },
                "DESC": {
                    "LABEL": "Description",
                    "PLACEHOLDER": "Enter rule description",
                    "ERROR": "Description is required"
                },
                "EVENT": {
                    "LABEL": "Event",
                    "PLACEHOLDER": "Please select one",
                    "ERROR": "Event is required"
                },
                "RUN_TYPE": {
                    "LABEL": "When should this rule run?",
                    "OPTIONS": {
                        "INSTANT": {
                            "LABEL": "Run instantly",
                            "DESCRIPTION": "Runs the moment an event happens, as long as the conditions match."
                        },
                        "WAIT": {
                            "LABEL": "Run after a wait",
                            "DESCRIPTION": "Waits for a set time and runs only if things are still the same. If they change, the rule is skipped."
                        }
                    }
                },
                "WAIT": {
                    "LABEL": "Wait condition",
                    "WHEN_LABEL": "When",
                    "STATUS_LABEL": "Status is",
                    "FOR_LABEL": "For",
                    "INBOX_LABEL": "Inbox",
                    "ERROR": "The wait must be between 10 minutes and 30 days",
                    "OPTIONS": {
                        "CONVERSATION_STATUS": "Conversation stays in a status",
                        "CUSTOMER_UNRESPONSIVE": "Customer hasn't replied",
                        "AGENT_UNRESPONSIVE": "No teammate has replied"
                    },
                    "DURATION": {
                        "MINUTES": "{count} minute | {count} minutes",
                        "HOURS": "{count} hour | {count} hours",
                        "DAYS": "{count} day | {count} days"
                    },
                    "EXPLANATION": {
                        "CONVERSATION_STATUS": "The clock starts when a conversation moves into this status. If it is still there {duration} later, the actions below run. If the status changes before then, nothing happens.",
                        "CUSTOMER_UNRESPONSIVE": "The clock starts when a teammate replies. If the customer hasn't written back {duration} later, the actions below run. If they do reply, nothing happens, and the next teammate reply starts the clock again.",
                        "AGENT_UNRESPONSIVE": "The clock starts when a customer sends a message. If no teammate has replied {duration} later, the actions below run. If someone replies before then, nothing happens."
                    },
                    "FOOTNOTE": "Only new activity starts a clock. Conversations already sitting in this state are picked up the next time something happens on them."
                },
                "CONDITIONS": {
                    "LABEL": "Conditions"
                },
                "ACTIONS": {
                    "LABEL": "Actions"
                }
            },
            "CONDITION_BUTTON_LABEL": "Add Condition",
            "ACTION_BUTTON_LABEL": "Add Action",
            "API": {
                "SUCCESS_MESSAGE": "Automation rule added successfully",
                "ERROR_MESSAGE": "Could not create automation rule, please try again later"
            }
        },
        "LIST": {
            "TABLE_HEADER": {
                "NAME": "Name",
                "ACTIVE": "Active",
                "CREATED_ON": "Created on",
                "ACTIONS": "Actions"
            },
            "404": "No automation rules found",
            "404_DELAYED": "No rules run after a wait yet",
            "TABS": {
                "INSTANT": "Runs instantly",
                "DELAYED": "Runs after a wait"
            },
            "DELAY_BADGE": "Runs after {delay}",
            "DELAY_DISABLED_BANNER": "Delayed execution is turned off for this account, so the rules below that run after a wait are paused until it is turned back on."
        },
        "DELETE": {
            "CONFIRM": {
                "TITLE": "Confirm Deletion",
                "MESSAGE": "Are you sure to delete ",
                "YES": "Yes, Delete",
                "NO": "No, Keep "
            },
            "API": {
                "SUCCESS_MESSAGE": "Automation rule deleted successfully",
                "ERROR_MESSAGE": "Could not delete automation rule, please try again later"
            }
        },
        "EDIT": {
            "TITLE": "Edit Automation Rule",
            "SUBMIT": "Update",
            "CANCEL_BUTTON_TEXT": "Cancel",
            "API": {
                "SUCCESS_MESSAGE": "Automation rule updated successfully",
                "ERROR_MESSAGE": "Could not update automation rule, please try again later"
            }
        },
        "CLONE": {
            "TOOLTIP": "Clone",
            "API": {
                "SUCCESS_MESSAGE": "Automation cloned successfully",
                "ERROR_MESSAGE": "Could not clone automation rule, please try again later"
            }
        },
        "FORM": {
            "EDIT": "Edit",
            "CREATE": "Create",
            "DELETE": "Delete",
            "CANCEL": "Cancel",
            "RESET_MESSAGE": "Changing event type will reset the conditions and events you have added below"
        },
        "CONDITION": {
            "DELETE_MESSAGE": "You need to have atleast one condition to save",
            "CONTACT_CUSTOM_ATTR_LABEL": "Contact Custom Attributes",
            "CONVERSATION_CUSTOM_ATTR_LABEL": "Conversation Custom Attributes"
        },
        "ACTION": {
            "DELETE_MESSAGE": "You need to have atleast one action to save",
            "TEAM_MESSAGE_INPUT_PLACEHOLDER": "Enter your message here",
            "TEAM_DROPDOWN_PLACEHOLDER": "Select teams",
            "EMAIL_INPUT_PLACEHOLDER": "Enter email",
            "URL_INPUT_PLACEHOLDER": "Enter URL",
            "INSERT_CONTACT_EMAIL": "Use contact's email"
        },
        "TOGGLE": {
            "ACTIVATION_TITLE": "Activate Automation Rule",
            "DEACTIVATION_TITLE": "Deactivate Automation Rule",
            "ACTIVATION_DESCRIPTION": "This action will activate the automation rule '{automationName}'. Are you sure you want to proceed?",
            "DEACTIVATION_DESCRIPTION": "This action will deactivate the automation rule '{automationName}'. Are you sure you want to proceed?",
            "CONFIRMATION_LABEL": "Yes",
            "CANCEL_LABEL": "No"
        },
        "EVENTS": {
            "CONVERSATION_CREATED": "Conversation Created",
            "CONVERSATION_UPDATED": "Conversation Updated",
            "MESSAGE_CREATED": "Message Created",
            "CONVERSATION_RESOLVED": "Conversation Resolved",
            "CONVERSATION_OPENED": "Conversation Opened"
        },
        "ACTIONS": {
            "ASSIGN_AGENT": "Assign to Agent",
            "ASSIGN_TEAM": "Assign a Team",
            "REMOVE_ASSIGNED_AGENT": "Remove Assigned Agent",
            "REMOVE_ASSIGNED_TEAM": "Remove Assigned Team",
            "ADD_LABEL": "Add a Label",
            "REMOVE_LABEL": "Remove a Label",
            "SEND_EMAIL_TO_TEAM": "Send an Email to Team",
            "SEND_MESSAGE": "Send a Message",
            "ADD_PRIVATE_NOTE": "Add a Private Note",
            "MUTE_CONVERSATION": "Mute Conversation",
            "SNOOZE_CONVERSATION": "Snooze Conversation",
            "OPEN_CONVERSATION": "Open conversation",
            "PENDING_CONVERSATION": "Mark conversation as pending",
            "RESOLVE_CONVERSATION": "Resolve Conversation",
            "CHANGE_PRIORITY": "Change Priority"
        },
        "ATTRIBUTES": {
            "MESSAGE_TYPE": "Message Type",
            "PRIVATE_NOTE": "Private Note",
            "MESSAGE_CONTAINS": "Message Content",
            "EMAIL": "Email",
            "INBOX": "Inbox",
            "CONVERSATION_LANGUAGE": "Conversation Language",
            "PHONE_NUMBER": "Phone Number",
            "STATUS": "Status",
            "BROWSER_LANGUAGE": "Browser Language",
            "MAIL_SUBJECT": "Email Subject",
            "COUNTRY_NAME": "Country",
            "COMPANY_NAME": "Company",
            "REFERER_LINK": "Referrer Link",
            "ASSIGNEE_NAME": "Assignee",
            "TEAM_NAME": "Team",
            "PRIORITY": "Priority",
            "LABELS": "Labels"
        },
        "NONE_OPTION": "None",
        "LAST_RESPONDING_AGENT": "Last Responding Agent",
        "MESSAGE_TYPES": {
            "INCOMING": "Incoming Message",
            "OUTGOING": "Outgoing Message"
        },
        "PRIORITY_TYPES": {
            "NONE": "None",
            "LOW": "Low",
            "MEDIUM": "Medium",
            "HIGH": "High",
            "URGENT": "Urgent"
        },
        "ERRORS": {
            "VALUE_REQUIRED": "Value is required",
            "ACTION_PARAMETERS_REQUIRED": "Action parameters are required",
            "ATLEAST_ONE_CONDITION_REQUIRED": "At least one condition is required",
            "ATLEAST_ONE_ACTION_REQUIRED": "At least one action is required"
        }
    },
    "AVATAR_EDITOR": {
        "GENERATED": "Make your own",
        "NAME": "Name",
        "SHUFFLE": "Random name",
        "OTHER_NAMES": "Other names, same setup",
        "USE_NAME": "Use the name {name}",
        "PINNED_NONE": "Nothing pinned: the whole picture follows the name. Drag a slider or press the lock to pin it.",
        "PINNED_COUNT": "{count} setting pinned | {count} settings pinned",
        "UNPIN_ALL": "Unpin all",
        "PIN": "Pin {label}",
        "UNPIN": "Unpin {label}",
        "AUTO": "Auto",
        "ONLY_FOR": "{labels}: {shapes} only",
        "GROUPS": {
            "SHAPE": "Shape",
            "BODY": "Body",
            "EYES": "Eyes",
            "COLOR": "Color",
            "DECORATION": "Decoration"
        },
        "SHAPES": {
            "ROUND": "Round",
            "ORGANIC": "Organic",
            "BOXY": "Boxy",
            "CAPSULE": "Capsule",
            "NUB": "Nub",
            "CLOUD": "Cloud",
            "DROPLET": "Droplet",
            "HEXAGON": "Hexagon",
            "SUN": "Sun",
            "TRIANGLE": "Triangle"
        },
        "TONES": {
            "PASTEL": "Pastel",
            "PALE": "Pale",
            "MID": "Mid",
            "DEEP": "Deep",
            "BRIGHT": "Bright",
            "INK": "Ink"
        },
        "AXES": {
            "BODY_R": "Size",
            "BODY_RATIO": "Proportion",
            "BODY_N": "Squareness",
            "BODY_ROT": "Tilt",
            "CAPSULE_SQUAT": "Squat",
            "POLY_ROUND": "Corner rounding",
            "EYE_RX": "Size",
            "EYE_RATIO": "Roundness",
            "EYE_N": "Squareness",
            "EYE_GAP": "Separation",
            "EYE_LEAN": "Lean",
            "GAZE_X": "Gaze x",
            "GAZE_Y": "Gaze y",
            "HUE": "Hue",
            "SUN_N": "Petals",
            "SUN_DIST": "Petal distance",
            "SUN_R": "Petal size",
            "SUN_ROT": "Petal rotation",
            "CLOUD_N": "Lobes",
            "NUB_N": "Nubs",
            "NUB_A0": "Nub angle",
            "NUB_R0": "Nub size",
            "DROPLET_TIP": "Tip length"
        }
    },
    "BILLING_SETTINGS": {
        "TITLE": "Billing",
        "DESCRIPTION": "Manage your subscription here, upgrade your plan and get more for your team.",
        "CURRENT_PLAN": {
            "TITLE": "Current Plan",
            "PLAN_NOTE": "You are currently subscribed to the **{plan}** plan with **{quantity}** licenses",
            "SEAT_COUNT": "Number of seats",
            "RENEWS_ON": "Renews on",
            "CURRENCY": "Currency"
        },
        "CURRENCY": {
            "SELECT": {
                "TITLE": "Choose your billing currency",
                "DESCRIPTION": "Select the currency you'd like to be billed in. This can't be changed once your subscription is created."
            },
            "OPTIONS": {
                "USD": "US Dollar (USD)",
                "BRL": "Brazilian Real (BRL)"
            }
        },
        "VIEW_PRICING": "View Pricing",
        "MANAGE_SUBSCRIPTION": {
            "TITLE": "Manage your subscription",
            "DESCRIPTION": "View your previous invoices, edit your billing details, or cancel your subscription.",
            "BUTTON_TXT": "Go to the billing portal"
        },
        "CAPTAIN": {
            "TITLE": "Captain",
            "DESCRIPTION": "Manage usage and credits for Captain AI.",
            "BUTTON_TXT": "Buy more credits",
            "DOCUMENTS": "Documents",
            "RESPONSES": "Credits",
            "UPGRADE": "Captain is not available on the free plan, upgrade now to get access to assistants, copilot and more.",
            "REFRESH_CREDITS": "Refresh"
        },
        "CHAT_WITH_US": {
            "TITLE": "Need help?",
            "DESCRIPTION": "Do you face any issues in billing? We are here to help.",
            "BUTTON_TXT": "Chat with us"
        },
        "NO_BILLING_USER": "Your billing account is being configured. Please refresh the page and try again.",
        "TOPUP": {
            "BUY_CREDITS": "Buy more credits",
            "MODAL_TITLE": "Buy AI Credits",
            "MODAL_DESCRIPTION": "Purchase additional credits for Captain AI.",
            "CREDITS": "CREDITS",
            "ONE_TIME": "one-time",
            "POPULAR": "Most Popular",
            "NOTE_TITLE": "Note:",
            "NOTE_DESCRIPTION": "Credits are added immediately and expire in 6 months. An active subscription is required to use credits. Purchased credits are consumed after your monthly plan credits.",
            "CANCEL": "Cancel",
            "PURCHASE": "Purchase Credits",
            "LOADING": "Loading options...",
            "FETCH_ERROR": "Failed to load credit options. Please try again.",
            "RETRY": "Retry",
            "PURCHASE_ERROR": "Failed to process purchase. Please try again.",
            "PURCHASE_SUCCESS": "Successfully added {credits} credits to your account",
            "CONFIRM": {
                "TITLE": "Confirm Purchase",
                "DESCRIPTION": "You are about to purchase {credits} credits for {amount}.",
                "INSTANT_DEDUCTION_NOTE": "Your saved card will be charged immediately upon confirmation.",
                "GO_BACK": "Go Back",
                "CONFIRM_PURCHASE": "Confirm Purchase"
            }
        }
    },
    "BOT_REPORTS": {
        "HEADER": "Bot Reports",
        "METRIC": {
            "TOTAL_CONVERSATIONS": {
                "LABEL": "No. of Conversations",
                "TOOLTIP": "Total number of conversations handled by the bot"
            },
            "TOTAL_RESPONSES": {
                "LABEL": "Total Responses",
                "TOOLTIP": "Total number of responses sent by the bot"
            },
            "RESOLUTION_RATE": {
                "LABEL": "Resolution Rate",
                "TOOLTIP": "Total number of conversations resolved by the bot / Total number of conversations handled by the bot * 100"
            },
            "HANDOFF_RATE": {
                "LABEL": "Handoff Rate",
                "TOOLTIP": "Total number of conversations handed off to agents / Total number of conversations handled by the bot * 100"
            }
        }
    },
    "BREADCRUMB": {
        "ARIA_LABEL": "Breadcrumb"
    },
    "BULK_ACTION": {
        "CONVERSATIONS_SELECTED": "{conversationCount} selected",
        "NONE": "None",
        "CLEAR_SELECTION": "Clear",
        "ASSIGN_AGENT_CONFIRMATION_LABEL": "Are you sure you want to assign {n} conversation to {agentName}? | Are you sure you want to assign {n} conversations to {agentName}?",
        "UNASSIGN_AGENT_CONFIRMATION_LABEL": "Are you sure you want to unassign {n} conversation? | Are you sure you want to unassign {n} conversations?",
        "YES": "Yes",
        "CANCEL": "Cancel",
        "SEARCH_INPUT_PLACEHOLDER": "Search",
        "ASSIGN_AGENT_TOOLTIP": "Assign agent",
        "ASSIGN_TEAM_TOOLTIP": "Assign team",
        "ASSIGN_SUCCESFUL": "Conversations assigned successfully.",
        "ASSIGN_FAILED": "Failed to assign conversations. Please try again.",
        "RESOLVE_SUCCESFUL": "Conversations resolved successfully.",
        "RESOLVE_FAILED": "Failed to resolve conversations. Please try again.",
        "ALL_CONVERSATIONS_SELECTED_ALERT": "Conversations visible on this page are only selected.",
        "UPDATE": {
            "CHANGE_STATUS": "Change status",
            "SNOOZE_UNTIL": "Snooze",
            "UPDATE_SUCCESFUL": "Conversation status updated successfully.",
            "UPDATE_FAILED": "Failed to update conversations. Please try again."
        },
        "RESOLVE": {
            "ALL_MISSING_ATTRIBUTES": "Cannot resolve conversations due to missing required attributes",
            "PARTIAL_SUCCESS": "Some conversations need required attributes before resolving and were skipped"
        },
        "LABELS": {
            "ASSIGN_LABELS": "Assign labels",
            "REMOVE_LABELS": "Remove labels",
            "ASSIGN_SELECTED_LABELS": "Assign selected labels",
            "REMOVE_SELECTED_LABELS": "Remove selected labels",
            "ASSIGN_SUCCESFUL": "Labels assigned successfully.",
            "ASSIGN_FAILED": "Failed to assign labels. Please try again.",
            "REMOVE_SUCCESFUL": "Labels removed successfully.",
            "REMOVE_FAILED": "Failed to remove labels. Please try again."
        },
        "TEAMS": {
            "NONE": "None",
            "ASSIGN_TEAM_CONFIRMATION_LABEL": "Are you sure you want to assign {n} conversation to {teamName}? | Are you sure you want to assign {n} conversations to {teamName}?",
            "UNASSIGN_TEAM_CONFIRMATION_LABEL": "Are you sure you want to unassign {n} conversation? | Are you sure you want to unassign {n} conversations?",
            "ASSIGN_SUCCESFUL": "Teams assigned successfully.",
            "ASSIGN_FAILED": "Failed to assign team. Please try again."
        }
    },
    "CALLS": {
        "ACTIVITY": {
            "ROOM_STARTED": ":actor started a voice room",
            "ROOM_ENDED": "The voice room ended · :duration · :count people joined",
            "DIRECT_ENDED_VOICE": "Voice call · :duration",
            "DIRECT_ENDED_VIDEO": "Video call · :duration",
            "DIRECT_MISSED": "Missed call",
            "DIRECT_NO_ANSWER": "No answer",
            "DIRECT_DECLINED_BY_PEER": "Call declined",
            "DIRECT_YOU_DECLINED": "You declined the call",
            "DIRECT_CANCELLED": "Call cancelled"
        },
        "DIRECT": {
            "CALL": "Call",
            "OPEN_CHAT": "Message",
            "CALL_VOICE": "Voice call",
            "CALL_VIDEO": "Video call",
            "CALLING": "Calling…",
            "RINGING": "Ringing…",
            "INCOMING_VOICE": "Incoming voice call",
            "INCOMING_VIDEO": "Incoming video call",
            "ACCEPT": "Answer",
            "ACCEPT_AUDIO_ONLY": "Audio only",
            "DECLINE": "Decline",
            "CANCEL": "Cancel call",
            "CALL_BACK": "Call back",
            "EXPAND": "Expand",
            "MINIMIZE": "Collapse",
            "END": "End call",
            "PEER_SPEAKING": "{name} is speaking",
            "YOU_SPEAKING": "You are speaking",
            "SPEAKER_OFF": "Mute speaker",
            "SPEAKER_ON": "Unmute speaker",
            "MUTE": "Mute",
            "CAMERA": "Camera",
            "SPEAKER": "Speaker",
            "DEVICES": "Devices",
            "HIDE": "Hide"
        },
        "ROOM": {
            "MICROPHONE_N": "Microphone {n}",
            "CAMERA_N": "Camera {n}",
            "LEFT_GROUP": "You are no longer in this group, so you left its voice room",
            "ROOM_FULL_NOW": "The voice room is full",
            "JOINED_ELSEWHERE": "You joined this room from another device or tab",
            "ROOM_CLOSED": "The voice room was closed",
            "REMOVED_YOU": "A group admin removed you from the room",
            "CONNECTION_LOST": "Lost connection to the voice room",
            "DEVICE_BLOCKED": "The browser has not allowed the microphone, camera or screen sharing",
            "NO_DEVICES": "No devices found",
            "CONNECTED": "Voice connected",
            "DEAFEN": "Deafen",
            "UNDEAFEN": "Undeafen",
            "YOU_ARE_SHARING": "You are sharing your screen",
            "LIVE": "Live",
            "FULLSCREEN": "Full screen",
            "MORE_PEOPLE": "+{count} more",
            "CHOOSE_MICROPHONE": "Choose microphone",
            "CHOOSE_CAMERA": "Choose camera",
            "JOIN": "Join voice room",
            "JOIN_OPEN": "Join · {count}",
            "OPEN_IN_LIST": "{count} people in the voice room",
            "TITLE": "Voice room",
            "IN_ROOM": "In the voice room",
            "PEOPLE": "{count} people",
            "YOU": "You",
            "MIC_ON": "Mute",
            "MIC_OFF": "Unmute",
            "CAMERA_ON": "Turn camera off",
            "CAMERA_OFF": "Turn camera on",
            "SCREEN_START": "Share screen",
            "SCREEN_STOP": "Stop sharing",
            "SCREEN_OF": "{name}'s screen",
            "DEVICES": "Choose microphone and camera",
            "EXPAND": "Open room",
            "MINIMIZE": "Minimize",
            "CHAT": "Group chat",
            "LEAVE": "Leave",
            "MUTE_PARTICIPANT": "Mute this person",
            "REMOVE_PARTICIPANT": "Remove from room",
            "MUTED": "Muted"
        },
        "ERRORS": {
            "ROOM_FULL": "The room is full (:max people)",
            "NOT_A_PARTICIPANT": "You are not in this call",
            "MODERATION_FORBIDDEN": "You cannot moderate this call",
            "CALL_ENDED": "This call has ended",
            "MEDIA_UNAVAILABLE": "Could not reach the call server, please try again in a few minutes",
            "NOT_DIRECT": "Calls are only available in one-to-one Yona chats",
            "NOT_FRIENDS": "You can only call friends",
            "BUSY": "This person is in another call",
            "YOU_BUSY": "You are already in another call"
        }
    },
    "CAMPAIGN": {
        "LIVE_CHAT": {
            "HEADER_TITLE": "Live chat campaigns",
            "NEW_CAMPAIGN": "Create campaign",
            "CARD": {
                "STATUS": {
                    "ENABLED": "Enabled",
                    "DISABLED": "Disabled"
                },
                "CAMPAIGN_DETAILS": {
                    "SENT_BY": "Sent by",
                    "BOT": "Bot",
                    "FROM": "from",
                    "URL": "URL:"
                }
            },
            "EMPTY_STATE": {
                "TITLE": "No live chat campaigns are available",
                "SUBTITLE": "Connect with your customers using proactive messages.  Click 'Create campaign' to get started."
            },
            "CREATE": {
                "TITLE": "Create a live chat campaign",
                "CANCEL_BUTTON_TEXT": "Cancel",
                "CREATE_BUTTON_TEXT": "Create",
                "FORM": {
                    "TITLE": {
                        "LABEL": "Title",
                        "PLACEHOLDER": "Please enter the title of campaign",
                        "ERROR": "Title is required"
                    },
                    "MESSAGE": {
                        "LABEL": "Message",
                        "PLACEHOLDER": "Please enter the message of campaign",
                        "ERROR": "Message is required"
                    },
                    "INBOX": {
                        "LABEL": "Select Inbox",
                        "PLACEHOLDER": "Select Inbox",
                        "ERROR": "Inbox is required"
                    },
                    "SENT_BY": {
                        "LABEL": "Sent by",
                        "PLACEHOLDER": "Please select sender",
                        "ERROR": "Sender is required"
                    },
                    "END_POINT": {
                        "LABEL": "URL",
                        "PLACEHOLDER": "Please enter the URL",
                        "ERROR": "Please enter a valid URL"
                    },
                    "TIME_ON_PAGE": {
                        "LABEL": "Time on page(Seconds)",
                        "PLACEHOLDER": "Please enter the time",
                        "ERROR": "Time on page is required"
                    },
                    "QUICK_REPLIES": {
                        "LABEL": "Quick reply chips",
                        "HINT": "Up to 3 chips under the invitation. Tapping one opens the chat and sends that text.",
                        "PLACEHOLDER": "E.g. Is this in stock?",
                        "ITEM": "Chip {index}",
                        "ERROR": "Each chip is at most 40 characters and must be unique"
                    },
                    "SHOW_TO": {
                        "LABEL": "Show to",
                        "ALL": "Everyone",
                        "NEW": "Visitors who never messaged",
                        "RETURNING": "Visitors who messaged before"
                    },
                    "OTHER_PREFERENCES": {
                        "TITLE": "Other preferences",
                        "ENABLED": "Enable campaign",
                        "TRIGGER_ONLY_BUSINESS_HOURS": "Trigger only during business hours"
                    },
                    "BUTTONS": {
                        "CREATE": "Create",
                        "CANCEL": "Cancel"
                    },
                    "API": {
                        "SUCCESS_MESSAGE": "Live chat campaign created successfully",
                        "ERROR_MESSAGE": "There was an error. Please try again."
                    }
                }
            },
            "EDIT": {
                "TITLE": "Edit live chat campaign",
                "FORM": {
                    "API": {
                        "SUCCESS_MESSAGE": "Live chat campaign updated successfully",
                        "ERROR_MESSAGE": "There was an error. Please try again."
                    }
                }
            }
        },
        "CONFIRM_DELETE": {
            "TITLE": "Are you sure to delete?",
            "DESCRIPTION": "The delete action is permanent and cannot be reversed.",
            "CONFIRM": "Delete",
            "API": {
                "SUCCESS_MESSAGE": "Campaign deleted successfully",
                "ERROR_MESSAGE": "There was an error. Please try again."
            }
        }
    },
    "CANNED_MGMT": {
        "HEADER": "Canned Responses",
        "LEARN_MORE": "Learn more about canned responses",
        "DESCRIPTION": "Canned Responses are pre-written reply templates that help you quickly respond to a conversation. Agents can type the '/' character followed by the shortcode to insert a canned response during a conversation. ",
        "COUNT": "{n} canned response | {n} canned responses",
        "HEADER_BTN_TXT": "Add canned response",
        "LOADING": "Fetching canned responses...",
        "SEARCH_PLACEHOLDER": "Search canned responses...",
        "NO_RESULTS": "No canned responses found matching your search",
        "SEARCH_404": "There are no items matching this query.",
        "LIST": {
            "404": "There are no canned responses available in this account.",
            "TITLE": "Manage canned responses",
            "DESC": "Canned Responses are predefined reply templates which can be used to quickly send out replies to conversations.",
            "TABLE_HEADER": {
                "SHORT_CODE": "Short code",
                "CONTENT": "Content",
                "ACTIONS": "Actions"
            },
            "UNKNOWN_CARD_TYPE": "Card"
        },
        "ADD": {
            "TITLE": "Add canned response",
            "DESC": "Canned Responses are predefined reply templates which can be used to quickly send out replies to conversations.",
            "CANCEL_BUTTON_TEXT": "Cancel",
            "FORM": {
                "SHORT_CODE": {
                    "LABEL": "Short code",
                    "PLACEHOLDER": "Please enter a short code.",
                    "ERROR": "Short Code is required."
                },
                "CONTENT": {
                    "LABEL": "Message",
                    "PLACEHOLDER": "Please write the message you want to save as a template to use later.",
                    "ERROR": "Message is required."
                },
                "SUBMIT": "Submit"
            },
            "API": {
                "SUCCESS_MESSAGE": "Canned response added successfully.",
                "ERROR_MESSAGE": "Could not connect to the server. Please try again."
            }
        },
        "EDIT": {
            "TITLE": "Edit canned response",
            "CANCEL_BUTTON_TEXT": "Cancel",
            "FORM": {
                "SHORT_CODE": {
                    "LABEL": "Short code",
                    "PLACEHOLDER": "Please enter a shortcode.",
                    "ERROR": "Short code is required."
                },
                "CONTENT": {
                    "LABEL": "Message",
                    "PLACEHOLDER": "Please write the message you want to save as a template to use later.",
                    "ERROR": "Message is required."
                },
                "SUBMIT": "Submit"
            },
            "BUTTON_TEXT": "Edit",
            "API": {
                "SUCCESS_MESSAGE": "Canned response is updated successfully.",
                "ERROR_MESSAGE": "Could not connect to the server. Please try again."
            },
            "CARD_VIEW": {
                "TYPE_LABEL": "Card type",
                "HINT": "This canned response sends a card. To change the card, send a new one from a conversation and save it as a canned response."
            }
        },
        "DELETE": {
            "BUTTON_TEXT": "Delete",
            "API": {
                "SUCCESS_MESSAGE": "Canned response deleted successfully.",
                "ERROR_MESSAGE": "Could not connect to the server. Please try again."
            },
            "CONFIRM": {
                "TITLE": "Confirm deletion",
                "MESSAGE": "Are you sure to delete ",
                "YES": "Yes, delete ",
                "NO": "No, keep "
            }
        }
    },
    "CAPTAIN_SETTINGS": {
        "TITLE": "Captain Settings",
        "DESCRIPTION": "Configure your AI models and features for Captain. Captain follows a credit based billing, you will be charged credits for every action Captain takes based on the model selected.",
        "LOADING": "Loading Captain configuration...",
        "LINK_TEXT": "Learn more about Captain Credits",
        "NOT_ENABLED": "Captain is not enabled for your account. Please upgrade your plan to access Captain features.",
        "MODEL_CONFIG": {
            "TITLE": "Model Configuration",
            "DESCRIPTION": "Select AI models for different features.",
            "SELECT_MODEL": "Select model",
            "CREDITS_PER_MESSAGE": "{credits} credit/message",
            "COMING_SOON": "Coming soon",
            "EDITOR": {
                "TITLE": "Editor Features",
                "DESCRIPTION": "Powers smart compose, grammar corrections, tone adjustments, and content enhancement in your message editor."
            },
            "ASSISTANT": {
                "TITLE": "Assistant",
                "DESCRIPTION": "Handles automated responses, conversation summaries, and intelligent reply suggestions for customer interactions."
            },
            "COPILOT": {
                "TITLE": "Co-pilot",
                "DESCRIPTION": "Provides real-time contextual suggestions, knowledge base recommendations, and proactive insights during conversations."
            }
        },
        "FEATURES": {
            "TITLE": "Features",
            "DESCRIPTION": "Enable or disable AI-powered features.",
            "AUDIO_TRANSCRIPTION": {
                "TITLE": "Audio Transcription",
                "DESCRIPTION": "Automatically convert voice messages and call recordings into searchable text transcripts.",
                "MODEL_TITLE": "Audio Transcription Model",
                "MODEL_DESCRIPTION": "Select the AI model to use for converting audio messages into text transcripts"
            },
            "HELP_CENTER_SEARCH": {
                "TITLE": "Help Center Search Indexing",
                "DESCRIPTION": "Use AI for context aware search inside your help center articles."
            },
            "LABEL_SUGGESTION": {
                "TITLE": "Label Suggestion",
                "DESCRIPTION": "Automatically suggest relevant labels and tags for conversations based on content analysis and context.",
                "MODEL_TITLE": "Label Suggestion Model",
                "MODEL_DESCRIPTION": "Select the AI model to use for analyzing conversations and suggesting appropriate labels"
            }
        },
        "API": {
            "SUCCESS": "Captain settings updated successfully.",
            "ERROR": "Failed to update Captain settings. Please try again."
        }
    },
    "CHANNEL_SELECTOR": {
        "COMING_SOON": "Coming soon"
    },
    "CHAT": {
        "COMPOSER": {
            "EDITING": "Editing message",
            "PLACEHOLDER": "Type a message…"
        },
        "TABS": {
            "ALL": "All",
            "REQUESTS": "Requests"
        },
        "NEW": {
            "TITLE": "New message",
            "DESCRIPTION": "Search by @username or name, then pick someone to see their profile and message them.",
            "HINT": "Type at least 2 characters to search."
        },
        "EMPTY": {
            "ALL": "No conversations yet. Tap the pen button to start one.",
            "REQUESTS": "No message requests waiting.",
            "START": "Pick a conversation or start a new one"
        },
        "REQUEST": {
            "TITLE": "{name} wants to message you",
            "BODY": "They won't know you've seen their messages until you accept.",
            "ACCEPT": "Accept",
            "DELETE": "Delete",
            "IGNORE": "Ignore",
            "BLOCK": "Block",
            "ACCEPTED": "Moved to your inbox",
            "IGNORED": "Request ignored",
            "BLOCKED_BODY": "You blocked this person. Their new messages won't reach your inbox.",
            "FAILED": "Something went wrong, try again later"
        },
        "ACTIONS": {
            "PIN": "Pin chat",
            "UNPIN": "Unpin",
            "MUTE": "Mute notifications",
            "UNMUTE": "Unmute notifications",
            "BLOCK": "Block",
            "UNBLOCK": "Unblock",
            "REPORT": "Report",
            "DELETE": "Delete conversation"
        },
        "BLOCK": {
            "BLOCKED": "Blocked",
            "UNBLOCKED": "Unblocked",
            "BANNER_BLOCKED_BY_ME": "You blocked this person. Unblock from the ⋮ menu to message again.",
            "BANNER_CANNOT_REPLY": "You can't send messages in this conversation.",
            "COMPOSER_LOCKED": "You can't send messages here"
        },
        "REPORT": {
            "TITLE": "Report {name}",
            "DESCRIPTION": "The Yona team will review it. They won't know who reported them.",
            "REASON": "Reason",
            "REASONS": {
                "SPAM": "Spam or ads",
                "HARASSMENT": "Harassment or threats",
                "INAPPROPRIATE": "Inappropriate content",
                "SCAM": "Scam",
                "OTHER": "Something else"
            },
            "NOTE_PLACEHOLDER": "Add details (optional)",
            "SUBMIT": "Send report",
            "SENT": "Report sent"
        },
        "DELETE": {
            "TITLE": "Delete conversation?",
            "DESCRIPTION": "It disappears from your list. The other person keeps it and isn't notified.",
            "CONFIRM": "Delete"
        },
        "PREVIEW": {
            "RECALLED": "Message unsent",
            "STICKER": "Sent a sticker",
            "BANK_TRANSFER": "Sent bank transfer details"
        },
        "FORWARD": {
            "TITLE": "Forward to",
            "SEND": "Send",
            "SENT": "Forwarded"
        },
        "SEARCH": {
            "TITLE": "Search in chat",
            "PLACEHOLDER": "Type at least 2 characters",
            "EMPTY": "No messages found."
        },
        "PRESENCE": {
            "ONLINE": "Active now",
            "MINUTES": "Active {count}m ago",
            "HOURS": "Active {count}h ago",
            "DAYS": "Active {count}d ago"
        },
        "SYSTEM": {
            "CREATED": ":actor created the group :title",
            "RENAMED": ":actor renamed the group to :title",
            "AVATAR_CHANGED": ":actor changed the group photo",
            "ADDED": ":actor added :names",
            "REMOVED": ":actor removed :name",
            "LEFT": ":name left the group",
            "JOINED_BY_LINK": ":name joined via invite link",
            "ADMIN_ADDED": ":actor made :name an admin",
            "ADMIN_REMOVED": ":actor removed :name as admin",
            "OWNER_TRANSFERRED": ":actor made :name the group owner",
            "OWNER_INHERITED": ":name is the new group owner"
        },
        "GROUP": {
            "NEW": "New group",
            "NEW_DESCRIPTION": "Name the group and pick friends. Others can join with an invite link after you create it.",
            "NAME": "Group name",
            "NAME_PLACEHOLDER": "For example: Morning coffee",
            "PICK_MEMBERS": "Search friends by name or @username",
            "SELECTED": "{count} selected",
            "NO_FRIENDS": "No friends to add. Others can join with an invite link.",
            "CREATE": "Create group",
            "INFO": "Group info",
            "MEMBERS": "{count} member | {count} members",
            "MEMBERS_TITLE": "Members ({count})",
            "ADD_MEMBERS": "Add friends",
            "ADD_MEMBERS_DESCRIPTION": "Pick friends to add to the group. Others can join with an invite link.",
            "ADD": "Add",
            "ADDED": "Added {count} people to the group",
            "INVITE_LINK": "Invite link",
            "INVITE_HINT": "Anyone with the link can join. The full link is only shown when you create it, so copy it right away. Creating a new link turns off the old one.",
            "INVITE_CREATE": "Create invite link",
            "INVITE_RENEW": "Create a new link",
            "INVITE_REVOKE": "Revoke",
            "INVITE_REVOKED": "Invite link revoked",
            "INVITE_ACTIVE": "Active · {uses}",
            "INVITE_USES": "used {count} times",
            "INVITE_EXPIRES": "expires {date}",
            "INVITE_NO_EXPIRY": "never expires",
            "INVITE_EMPTY": "No active invite links.",
            "COPY": "Copy",
            "COPIED": "Link copied",
            "RENAME": "Rename group",
            "CHANGE_AVATAR": "Change group picture",
            "CHANGE_AVATAR_DESCRIPTION": "Use member photos, upload a photo or make your own picture for the group. Every member sees it.",
            "UPLOAD_PHOTO": "Upload a photo",
            "UPLOADED_PHOTO": "Uploaded photo",
            "PHOTO_UNREADABLE": "This image could not be read. Choose another JPG, PNG, GIF or WebP file.",
            "MEMBER_AVATARS": "Member photos",
            "SAVE": "Save",
            "ROLES": {
                "ADMIN": "Admin",
                "MEMBER": "Member"
            },
            "JOINED_VIA": {
                "CREATOR": "created the group",
                "ADDED": "added",
                "INVITE_LINK": "joined with a link"
            },
            "YOU": "{name} (you)",
            "MEMBER_ACTIONS": "Actions for {name}",
            "VIEW_PROFILE": "View profile",
            "MAKE_ADMIN": "Make admin",
            "REMOVE_ADMIN": "Remove as admin",
            "REMOVE": "Remove from group",
            "REMOVE_CONFIRM": "Remove",
            "REMOVE_TITLE": "Remove {name} from the group?",
            "REMOVE_BODY": "They stop getting new group messages and can still read messages up to when they left.",
            "LEAVE": "Leave group",
            "LEAVE_TITLE": "Leave the group?",
            "LEAVE_BODY": "You stop getting new group messages and can still read messages up to when you left. If you are the last admin, the longest-standing member becomes admin.",
            "LEFT_NOTICE": "You are no longer in this group.",
            "ERROR": "That did not work. Please try again.",
            "INVITE_PAGE": {
                "TITLE": "Join {name}",
                "INVITED_BY": "{name} invited you to the group",
                "INVITED": "You are invited to the group",
                "JOIN": "Join group",
                "OPEN": "Open group",
                "ALREADY_MEMBER": "You are already in this group.",
                "HISTORY_HINT": "Once you join you can read earlier group messages. You can leave at any time.",
                "SIGNUP": "Create an account to join",
                "LOGIN": "Already have an account? Log in",
                "BACK_HOME": "Back to home",
                "ERRORS": {
                    "NOT_FOUND": {
                        "TITLE": "Invite link not found",
                        "DESC": "The link may be mistyped. Ask the person who invited you to send it again."
                    },
                    "REVOKED": {
                        "TITLE": "This invite link was revoked",
                        "DESC": "A group admin turned this link off. Ask for a new one."
                    },
                    "EXPIRED": {
                        "TITLE": "This invite link has expired",
                        "DESC": "Ask a group admin for a new link."
                    },
                    "EXHAUSTED": {
                        "TITLE": "This invite link has been used up",
                        "DESC": "Ask a group admin for a new link."
                    }
                }
            }
        },
        "ERRORS": {
            "NOT_ALLOWED": "You don't have permission to do this",
            "GROUP_FULL": "Groups can have up to :limit members",
            "GROUP_TOO_SMALL": "Pick at least :count people to create a group",
            "INVITE_INVALID": "This invite link is no longer valid",
            "NOT_EDITABLE": "This message can't be edited",
            "BLOCKED": "Can't send because one of you has blocked the other",
            "NOT_MEMBER": "You're no longer in this conversation",
            "SELF": "You can't message yourself",
            "EMPTY": "The message is empty"
        }
    },
    "CHAT_LIST": {
        "LOADING": "Fetching conversations",
        "LOAD_MORE_CONVERSATIONS": "Load more conversations",
        "EOF": "All conversations loaded 🎉",
        "LIST": {
            "404": "There are no active conversations in this group.",
            "NONE_ASSIGNED_TO_ME": "No conversation is assigned to you.",
            "NONE_UNASSIGNED": "Every conversation already has an assignee.",
            "VIEW_UNASSIGNED": "View {count} unassigned",
            "VIEW_ALL": "View all {count} conversations"
        },
        "FAILED_TO_SEND": "Failed to send",
        "FETCH_ERROR": "Couldn't load conversations. Please try again.",
        "TAB_HEADING": "Conversations",
        "MENTION_HEADING": "Mentions",
        "UNATTENDED_HEADING": "Unattended",
        "SEARCH": {
            "INPUT": "Search",
            "LABEL": "Search conversations in this list",
            "CLEAR": "Clear search",
            "COMPOSE": "New message",
            "NO_RESULTS": "No conversation in this list matches “{query}”.",
            "CONTACTS_HEADING": "People",
            "CONVERSATIONS_HEADING": "Conversations"
        },
        "FILTER_ALL": "All",
        "SELECTION_MODE": {
            "START": "Select conversations",
            "EXIT": "Exit selection"
        },
        "MORE_ACTIONS": "More actions",
        "FILTER_PANEL": {
            "BUTTON": "Filter conversations",
            "BUTTON_ACTIVE": "Filter conversations, {count} filters on",
            "TITLE": "Filter conversations",
            "ACTIVE": "Active filters",
            "REMOVE": "Remove filter {name}",
            "UNREAD": "{count} unread conversations",
            "STATUS": "Status",
            "CHANNEL": "Channel",
            "ALL_CHANNELS": "All channels",
            "SHOW_ALL_CHANNELS": "Show all channels",
            "COLLAPSE_CHANNELS": "Collapse channel list",
            "LABEL": "Label",
            "SORT": "Sort",
            "ADVANCED": "Advanced filters",
            "CLEAR": "Clear filters",
            "STATUS_ITEMS": {
                "open": "Open",
                "pending": "Pending",
                "snoozed": "Snoozed",
                "resolved": "Resolved",
                "all": "All"
            },
            "SORT_ITEMS": {
                "last_activity_at_desc": "Newest",
                "waiting_since_asc": "Waiting longest",
                "unread": "Most unread"
            }
        },
        "ASSIGNEE_TYPE_TABS": {
            "me": "Mine",
            "unassigned": "Unassigned",
            "all": "All"
        },
        "CHAT_STATUS_FILTER_ITEMS": {
            "open": {
                "TEXT": "Open"
            },
            "resolved": {
                "TEXT": "Resolved"
            },
            "pending": {
                "TEXT": "Pending"
            },
            "snoozed": {
                "TEXT": "Snoozed"
            },
            "all": {
                "TEXT": "All"
            }
        },
        "VIEW_FILTER": "View",
        "CHAT_TIME_STAMP": {
            "CREATED": {
                "LATEST": "Created",
                "OLDEST": "Created at:"
            },
            "LAST_ACTIVITY": {
                "NOT_ACTIVE": "Last activity:",
                "ACTIVE": "Last activity"
            }
        },
        "SORT_ORDER_ITEMS": {
            "last_activity_at_asc": {
                "TEXT": "Last activity: Oldest first"
            },
            "last_activity_at_desc": {
                "TEXT": "Last activity: Newest first"
            },
            "created_at_desc": {
                "TEXT": "Created at: Newest first"
            },
            "created_at_asc": {
                "TEXT": "Created at: Oldest first"
            },
            "priority_desc": {
                "TEXT": "Priority: Highest first"
            },
            "priority_asc": {
                "TEXT": "Priority: Lowest first"
            },
            "waiting_since_asc": {
                "TEXT": "Pending Response: Longest first"
            },
            "waiting_since_desc": {
                "TEXT": "Pending Response: Shortest first"
            },
            "priority_desc_created_at_asc": {
                "TEXT": "Priority: Highest first, Created: Oldest first"
            },
            "unread": {
                "TEXT": "Unread Count: Highest first"
            }
        },
        "ATTACHMENTS": {
            "image": {
                "CONTENT": "Picture message"
            },
            "audio": {
                "CONTENT": "Audio message"
            },
            "video": {
                "CONTENT": "Video message"
            },
            "file": {
                "CONTENT": "File Attachment"
            },
            "location": {
                "CONTENT": "Location"
            },
            "ig_reel": {
                "CONTENT": "Instagram Reel"
            },
            "fallback": {
                "CONTENT": "has shared a url"
            },
            "contact": {
                "CONTENT": "Shared contact card"
            },
            "embed": {
                "CONTENT": "Embedded content"
            },
            "sticker": {
                "CONTENT": "Sticker"
            }
        },
        "CHAT_SORT_BY_FILTER": {
            "TITLE": "Sort conversation",
            "DROPDOWN_TITLE": "Sort by",
            "ITEMS": {
                "LATEST": {
                    "NAME": "Last activity at",
                    "LABEL": "Last activity"
                },
                "CREATED_AT": {
                    "NAME": "Created at",
                    "LABEL": "Created at"
                },
                "LAST_USER_MESSAGE_AT": {
                    "NAME": "Last user message at",
                    "LABEL": "Last message"
                }
            }
        },
        "RECEIVED_VIA_EMAIL": "Received via email",
        "VIEW_TWEET_IN_TWITTER": "View tweet in Twitter",
        "REPLY_TO_TWEET": "Reply to this tweet",
        "LINK_TO_STORY": "Go to instagram story",
        "SENT": "Sent successfully",
        "READ": "Read successfully",
        "DELIVERED": "Delivered successfully",
        "NO_MESSAGES": "No Messages",
        "SENDER_YOU": "You",
        "NO_CONTENT": "No content available",
        "FRIEND_REQUEST": "[Friend request]",
        "HIDE_QUOTED_TEXT": "Hide Quoted Text",
        "SHOW_QUOTED_TEXT": "Show Quoted Text",
        "MESSAGE_READ": "Read",
        "SENDING": "Sending",
        "UNREAD_COUNT_OVERFLOW": "9+"
    },
    "CHOICE_TOGGLE": {
        "YES": "Yes",
        "NO": "No"
    },
    "COMBOBOX": {
        "PLACEHOLDER": "Select an option...",
        "EMPTY_SEARCH_RESULTS": "No items found for the search term `{searchTerm}`",
        "EMPTY_STATE": "No results found.",
        "SEARCH_PLACEHOLDER": "Search...",
        "MORE": "+{count} more"
    },
    "COMMAND_BAR": {
        "SEARCH_PLACEHOLDER": "Search or jump to",
        "SNOOZE_PLACEHOLDER": "Type a time e.g. tomorrow, 2 hours, next friday, jan 15...",
        "SECTIONS": {
            "GENERAL": "General",
            "REPORTS": "Reports",
            "CONVERSATION": "Conversation",
            "BULK_ACTIONS": "Bulk Actions",
            "CHANGE_ASSIGNEE": "Change Assignee",
            "CHANGE_PRIORITY": "Change Priority",
            "CHANGE_TEAM": "Change Team",
            "SNOOZE_CONVERSATION": "Snooze Conversation",
            "EXECUTE_MACRO": "Execute Macro",
            "ADD_LABEL": "Add label to the conversation",
            "REMOVE_LABEL": "Remove label from the conversation",
            "SETTINGS": "Settings",
            "AI_ASSIST": "AI Assist",
            "SNOOZE_NOTIFICATION": "Snooze Notification"
        },
        "COMMANDS": {
            "GO_TO_MY_INBOX": "Go to notifications",
            "COMPOSE_CONVERSATION": "New message",
            "CREATE_GROUP": "New group",
            "GO_TO_CONVERSATION_DASHBOARD": "Go to Conversation Dashboard",
            "GO_TO_CONTACTS_DASHBOARD": "Go to Friends",
            "GO_TO_CAPTAIN": "Go to Captain",
            "GO_TO_CALLS_DASHBOARD": "Go to Calls Dashboard",
            "GO_TO_CAMPAIGNS": "Go to Campaigns",
            "GO_TO_HELP_CENTER": "Go to Help Center",
            "GO_TO_REPORTS_OVERVIEW": "Go to Reports Overview",
            "GO_TO_CONVERSATION_REPORTS": "Go to Conversation Reports",
            "GO_TO_AGENT_REPORTS": "Go to Agent Reports",
            "GO_TO_LABEL_REPORTS": "Go to Label Reports",
            "GO_TO_INBOX_REPORTS": "Go to Inbox Reports",
            "GO_TO_TEAM_REPORTS": "Go to Team Reports",
            "GO_TO_CSAT_REPORTS": "Go to CSAT Reports",
            "GO_TO_BOT_REPORTS": "Go to Bot Reports",
            "GO_TO_SLA_REPORTS": "Go to SLA Reports",
            "GO_TO_SETTINGS_AGENTS": "Go to Agent Settings",
            "GO_TO_SETTINGS_TEAMS": "Go to Team Settings",
            "GO_TO_SETTINGS_INBOXES": "Go to Inbox Settings",
            "GO_TO_SETTINGS_TEMPLATES": "Go to Templates",
            "GO_TO_SETTINGS_LABELS": "Go to Label Settings",
            "GO_TO_SETTINGS_CUSTOM_ATTRIBUTES": "Go to Custom Attributes",
            "GO_TO_SETTINGS_AUTOMATION": "Go to Automation",
            "GO_TO_SETTINGS_MACROS": "Go to Macros",
            "GO_TO_SETTINGS_CANNED_RESPONSES": "Go to Canned Response Settings",
            "GO_TO_SETTINGS_SLA": "Go to SLA Settings",
            "GO_TO_SETTINGS_APPLICATIONS": "Go to Application Settings",
            "GO_TO_SETTINGS_DATA": "Go to Data",
            "GO_TO_SETTINGS_AUDIT_LOGS": "Go to Audit Logs",
            "GO_TO_SETTINGS_BILLING": "Go to Billing",
            "GO_TO_SETTINGS_ACCOUNT": "Go to Account Settings",
            "GO_TO_SETTINGS_PROFILE": "Go to Profile Settings",
            "CHANGE_LANGUAGE": "Change interface language",
            "CHANGE_APPEARANCE": "Change color mode (light / dark)",
            "ADD_LABELS_TO_CONVERSATION": "Add label to the conversation",
            "ASSIGN_AN_AGENT": "Assign an agent",
            "AI_ASSIST": "AI Assist",
            "ASSIGN_PRIORITY": "Assign priority",
            "ASSIGN_A_TEAM": "Assign a team",
            "EXECUTE_A_MACRO": "Execute a macro",
            "MUTE_CONVERSATION": "Mute conversation",
            "UNMUTE_CONVERSATION": "Unmute conversation",
            "REMOVE_LABEL_FROM_CONVERSATION": "Remove label from the conversation",
            "REOPEN_CONVERSATION": "Reopen conversation",
            "RESOLVE_CONVERSATION": "Resolve conversation",
            "SEND_TRANSCRIPT": "Send an email transcript",
            "SNOOZE_CONVERSATION": "Snooze Conversation",
            "UNTIL_NEXT_REPLY": "Until next reply",
            "UNTIL_NEXT_WEEK": "Until next week",
            "UNTIL_TOMORROW": "Until tomorrow",
            "UNTIL_NEXT_MONTH": "Until next month",
            "AN_HOUR_FROM_NOW": "Until an hour from now",
            "UNTIL_CUSTOM_TIME": "Custom...",
            "SNOOZE_NOTIFICATION": "Snooze Notification"
        },
        "NO_RESULTS": "No results found",
        "FOOTER": {
            "SELECT": "to select",
            "NAVIGATE": "to navigate",
            "CLOSE": "to close",
            "MOVE_TO_PARENT": "move to parent",
            "ESC_KEY": "esc"
        }
    },
    "COMMON": {
        "OR": "Or",
        "CLICK_HERE": "click here"
    },
    "COMPONENTS": {
        "LOADER": {
            "LABEL": "Loading"
        },
        "CODE": {
            "BUTTON_TEXT": "Copy",
            "CODEPEN": "Open in CodePen",
            "COPY_SUCCESSFUL": "Copied to clipboard"
        },
        "SHOW_MORE_BLOCK": {
            "SHOW_MORE": "Show More",
            "SHOW_LESS": "Show Less"
        },
        "FILE_BUBBLE": {
            "DOWNLOAD": "Download",
            "UPLOADING": "Uploading...",
            "INSTAGRAM_STORY_UNAVAILABLE": "This story is no longer available.",
            "INSTAGRAM_STORY_REPLY": "Replied to your story:"
        },
        "LOCATION_BUBBLE": {
            "SEE_ON_MAP": "See on map"
        },
        "FORM_BUBBLE": {
            "SUBMIT": "Submit"
        },
        "MEDIA": {
            "IMAGE_UNAVAILABLE": "This image is no longer available.",
            "LOADING_FAILED": "Loading failed",
            "TAP_TO_RELOAD": "Tap to reload",
            "OPEN_IMAGE": "View image",
            "OPEN_VIDEO": "View video",
            "OPEN_FILE": "Open file",
            "ATTACHMENTS_COUNT": "{count} file | {count} files",
            "REMOVE_ATTACHMENT": "Remove this file"
        }
    },
    "COMPOSE_NEW_CONVERSATION": {
        "CONTACT_SEARCH": {
            "ERROR_MESSAGE": "We couldn’t complete the search. Please try again."
        },
        "DRAFT": {
            "TITLE": "New message",
            "EMPTY": "No messages yet. Pick a recipient and a channel, then write below.",
            "SENDING": "Opening the conversation and sending…",
            "COMPOSER_LOCKED": "Pick a recipient and a channel to start writing",
            "SUBJECT_LABEL": "Subject:",
            "NEW_CONTACT_BADGE": "New person",
            "CREATE_CONTACT": "Add new person: {address}",
            "CONTACT_LOAD_FAILED": "Could not load the recipient. Please pick them again.",
            "LOADING_CHANNELS": "Finding channels that can reach this person…",
            "LOAD_CHANNELS_FAILED": "Could not load the channels.",
            "CREATED_ELSEWHERE": "The conversation from your draft has been created.",
            "OPEN_CONVERSATION": "Open conversation",
            "RETRY": "Retry",
            "UNAVAILABLE": {
                "MESSAGING_WINDOW_CLOSED": "The channel's reply window since the customer's last message has passed",
                "REAUTHORIZATION_REQUIRED": "The channel is disconnected and needs to sign in again",
                "EMAIL_UNDELIVERABLE": "This person's email address cannot receive mail",
                "OTHER": "This channel cannot reach this person right now"
            },
            "EMAIL_CHECK": {
                "CHECKING": "Checking the email address…",
                "INVALID_SYNTAX": "The email address is malformed — it cannot be sent to.",
                "DOMAIN_NOT_FOUND": "This address's domain does not exist — mail will not arrive.",
                "DOMAIN_NO_MAIL": "This address's domain does not accept mail — mail will not arrive.",
                "UNDELIVERABLE": "This email address cannot receive mail."
            },
            "ERRORS": {
                "NO_RECIPIENT": "Pick a recipient before sending.",
                "NO_CHANNEL": "Pick a channel that can send before sending.",
                "EMAIL_CHECKING": "Still checking the email address, please wait a moment.",
                "EMAIL_UNDELIVERABLE": "This email address cannot receive mail, please check the recipient.",
                "SUBJECT_REQUIRED": "An email needs a subject."
            }
        },
        "FORM": {
            "ERROR_MESSAGE": "An error occurred while creating the conversation. Please try again later.",
            "NO_INBOX_ALERT": "There are no available inboxes to start a conversation with this person.",
            "CONTACT_SELECTOR": {
                "LABEL": "To:",
                "TAG_INPUT_PLACEHOLDER": "Enter at least 2 characters to search by name, email, or phone number",
                "NO_RESULTS": "No one found",
                "CHANGE": "Change recipient"
            },
            "INBOX_SELECTOR": {
                "LABEL": "Via:",
                "PICK_CONTACT_FIRST": "Pick a recipient to see the inboxes that can reach them"
            },
            "EMAIL_OPTIONS": {
                "SUBJECT_PLACEHOLDER": "Enter your email subject here"
            }
        }
    },
    "CONTACT_FORM": {
        "FORM": {
            "SUBMIT": "Submit",
            "CANCEL": "Cancel",
            "AVATAR": {
                "LABEL": "Avatar"
            },
            "NAME": {
                "PLACEHOLDER": "Enter the full name",
                "LABEL": "Full Name"
            },
            "BIO": {
                "PLACEHOLDER": "Enter a short bio",
                "LABEL": "Bio"
            },
            "EMAIL_ADDRESS": {
                "PLACEHOLDER": "Enter the email address",
                "LABEL": "Email Address",
                "DUPLICATE": "This email address already belongs to another profile.",
                "ERROR": "Please enter a valid email address."
            },
            "PHONE_NUMBER": {
                "PLACEHOLDER": "Enter the phone number",
                "LABEL": "Phone Number",
                "HELP": "Phone number should be of E.164 format eg: +1415555555 [+][country code][area code][local phone number]. You can select the dial code from the dropdown.",
                "ERROR": "Phone number should be either empty or of E.164 format",
                "DIAL_CODE_ERROR": "Please select a dial code from the list",
                "DUPLICATE": "This phone number already belongs to another profile."
            },
            "LOCATION": {
                "PLACEHOLDER": "Enter the location",
                "LABEL": "Location"
            },
            "COMPANY_NAME": {
                "PLACEHOLDER": "Enter the company name",
                "LABEL": "Company Name"
            },
            "COUNTRY": {
                "PLACEHOLDER": "Enter the country name",
                "LABEL": "Country Name",
                "SELECT_PLACEHOLDER": "Select",
                "REMOVE": "Remove",
                "SELECT_COUNTRY": "Select Country"
            },
            "CITY": {
                "PLACEHOLDER": "Enter the city name",
                "LABEL": "City Name"
            },
            "SOCIAL_PROFILES": {
                "FACEBOOK": {
                    "PLACEHOLDER": "Enter the Facebook username",
                    "LABEL": "Facebook"
                },
                "TWITTER": {
                    "PLACEHOLDER": "Enter the Twitter username",
                    "LABEL": "Twitter"
                },
                "LINKEDIN": {
                    "PLACEHOLDER": "Enter the LinkedIn username",
                    "LABEL": "LinkedIn"
                },
                "GITHUB": {
                    "PLACEHOLDER": "Enter the Github username",
                    "LABEL": "Github"
                }
            }
        },
        "DELETE_AVATAR": {
            "API": {
                "SUCCESS_MESSAGE": "Avatar deleted",
                "ERROR_MESSAGE": "Could not delete the avatar. Please try again later."
            }
        },
        "SUCCESS_MESSAGE": "Saved successfully",
        "ERROR_MESSAGE": "There was an error, please try again"
    },
    "CONTACT_PANEL": {
        "ADD_EMAIL_ADDRESS": "Add email",
        "ADD_PHONE_NUMBER": "Add phone number",
        "ADD_COMPANY": "Add company",
        "NOT_AVAILABLE": "Not Available",
        "EMAIL_ADDRESS": "Email Address",
        "PHONE_NUMBER": "Phone number",
        "IDENTIFIER": "Identifier",
        "COPY_SUCCESSFUL": "Copied to clipboard successfully",
        "COMPANY": "Company",
        "LOCATION": "Location",
        "BROWSER_LANGUAGE": "Browser Language",
        "CONVERSATION_TITLE": "Conversation Details",
        "VIEW_PROFILE": "View Profile",
        "BROWSER": "Browser",
        "OS": "Operating System",
        "INITIATED_FROM": "Initiated from",
        "INITIATED_AT": "Initiated at",
        "IP_ADDRESS": "IP Address",
        "CREATED_AT_LABEL": "Created",
        "NEW_MESSAGE": "New message",
        "START_NEW_CONVERSATION": "Start a new conversation",
        "DELETE_CONTACT": "Remove from list",
        "MORE_ACTIONS": "More actions",
        "CALL": "Call",
        "CALL_INITIATED": "Calling this person…",
        "CALL_FAILED": "Unable to start the call. Please try again.",
        "WHATSAPP_CALL_PERMISSION_REQUESTED": "Sent a call permission request to this person. Try again once they accept.",
        "WHATSAPP_CALL_PERMISSION_PENDING": "Call permission request already sent recently. Try again once they accept.",
        "CLICK_TO_EDIT": "Click to edit",
        "VOICE_INBOX_PICKER": {
            "TITLE": "Choose a voice inbox"
        },
        "CONVERSATIONS": {
            "NO_RECORDS_FOUND": "No previous conversations with this person.",
            "TITLE": "Previous Conversations"
        },
        "LABELS": {
            "CONTACT": {
                "TITLE": "Profile labels",
                "ERROR": "Couldn't update labels"
            },
            "CONVERSATION": {
                "TITLE": "Conversation Labels",
                "ADD_BUTTON": "Add Labels"
            },
            "LABEL_SELECT": {
                "TITLE": "Add Labels",
                "PLACEHOLDER": "Search labels",
                "NO_RESULT": "No labels found",
                "CREATE_LABEL": "Create new label",
                "CREATE_NAMED": "Create label \"{title}\"",
                "CUSTOMIZE": "Customize"
            }
        },
        "MERGE_CONTACT": "Merge profiles",
        "CONTACT_ACTIONS": "Options",
        "MUTE_CONTACT": "Block",
        "UNMUTE_CONTACT": "Unblock",
        "MUTED_SUCCESS": "This person is blocked. You will not be notified of any future conversations.",
        "UNMUTED_SUCCESS": "This person is unblocked.",
        "SEND_TRANSCRIPT": "Send Transcript",
        "EDIT_LABEL": "Edit",
        "SIDEBAR_SECTIONS": {
            "CUSTOM_ATTRIBUTES": "Custom Attributes",
            "CONTACT_LABELS": "Profile labels",
            "PREVIOUS_CONVERSATIONS": "Previous Conversations",
            "NO_RECORDS_FOUND": "No attributes found"
        }
    },
    "CONTACTS": {
        "online": {
            "delete": "{contact_name} is Online, please try again later"
        },
        "anonymous": {
            "name": "Anonymous :animal",
            "name_numbered": "Anonymous :animal :number",
            "animals": [
                "Raccoon",
                "Panda",
                "Red Panda",
                "Koala",
                "Polar Bear",
                "Brown Bear",
                "Squirrel",
                "Flying Squirrel",
                "Chipmunk",
                "Rabbit",
                "Hedgehog",
                "Otter",
                "Beaver",
                "Ferret",
                "Meerkat",
                "Sloth",
                "Platypus",
                "Pangolin",
                "Guinea Pig",
                "Kangaroo",
                "Red Fox",
                "Arctic Fox",
                "Tabby Cat",
                "Kitten",
                "Lynx",
                "Puppy",
                "Tiger Cub",
                "Lion Cub",
                "Snow Leopard",
                "Jaguar",
                "Golden Deer",
                "Sika Deer",
                "Giraffe",
                "Reindeer",
                "Antelope",
                "Zebra",
                "Lamb",
                "Camel",
                "Alpaca",
                "Elephant",
                "Hippo",
                "Rhino",
                "Dolphin",
                "Blue Whale",
                "Seal",
                "Sea Lion",
                "Sea Turtle",
                "Starfish",
                "Jellyfish",
                "Octopus",
                "Clownfish",
                "Goldfish",
                "Koi Fish",
                "Pufferfish",
                "Manta Ray",
                "Coral",
                "Sea Anemone",
                "Sea Urchin",
                "Owl",
                "Penguin",
                "Hummingbird",
                "Dove",
                "Pelican",
                "Seagull",
                "Flamingo",
                "Swan",
                "Mandarin Duck",
                "Peacock",
                "Skylark",
                "Nightingale",
                "Bulbul",
                "White-eye",
                "Magpie Robin",
                "Red-crowned Crane",
                "White Crane",
                "Little Swallow",
                "Eagle",
                "Firefly",
                "Ladybug",
                "Dragonfly",
                "Honeybee",
                "Cricket",
                "Praying Mantis",
                "Weaver Ant",
                "Grasshopper",
                "Snail",
                "Axolotl",
                "Unicorn",
                "Phoenix"
            ]
        }
    },
    "CONTACTS_BULK_ACTIONS": {
        "ASSIGN_LABELS": "Assign Labels",
        "REMOVE_LABELS": "Remove Labels",
        "ASSIGN_LABELS_SUCCESS": "Labels assigned successfully.",
        "ASSIGN_LABELS_FAILED": "Failed to assign labels",
        "REMOVE_LABELS_SUCCESS": "Labels removed successfully.",
        "REMOVE_LABELS_FAILED": "Failed to remove labels",
        "DESCRIPTION": "Select the labels you want to add to the selected people.",
        "NO_LABELS_FOUND": "No labels available yet.",
        "SELECTED_COUNT": "{count} selected",
        "CLEAR_SELECTION": "Clear selection",
        "SELECT_ALL": "Select all ({count})",
        "DELETE_CONTACTS": "Delete",
        "DELETE_SUCCESS": "Removed from your list.",
        "DELETE_FAILED": "Could not remove. Please try again.",
        "DELETE_DIALOG": {
            "TITLE": "Remove selected people",
            "SINGULAR_TITLE": "Remove selected person",
            "DESCRIPTION": "This will permanently remove {count} selected people from your list. This action cannot be undone.",
            "SINGULAR_DESCRIPTION": "This will permanently remove the selected person from your list. This action cannot be undone.",
            "CONFIRM_MULTIPLE": "Remove from list",
            "CONFIRM_SINGLE": "Remove from list"
        }
    },
    "CONTACTS_FILTER": {
        "TITLE": "Filter list",
        "SUBTITLE": "Add filters below and hit 'Submit' to filter the list.",
        "EDIT_CUSTOM_SEGMENT": "Edit Segment",
        "CUSTOM_VIEWS_SUBTITLE": "Add or remove filters and update your segment.",
        "ADD_NEW_FILTER": "Add Filter",
        "CLEAR_ALL_FILTERS": "Clear All Filters",
        "FILTER_DELETE_ERROR": "You should have atleast one filter to save",
        "SUBMIT_BUTTON_LABEL": "Submit",
        "UPDATE_BUTTON_LABEL": "Update Segment",
        "CANCEL_BUTTON_LABEL": "Cancel",
        "CLEAR_BUTTON_LABEL": "Clear Filters",
        "EMPTY_VALUE_ERROR": "Value is required",
        "SEGMENT_LABEL": "Segment Name",
        "SEGMENT_QUERY_LABEL": "Segment Query",
        "TOOLTIP_LABEL": "Filter list",
        "QUERY_DROPDOWN_LABELS": {
            "AND": "AND",
            "OR": "OR"
        },
        "OPERATOR_LABELS": {
            "equal_to": "Equal to",
            "not_equal_to": "Not equal to",
            "contains": "Contains",
            "does_not_contain": "Does not contain",
            "is_present": "Is present",
            "is_not_present": "Is not present",
            "is_greater_than": "Is greater than",
            "is_lesser_than": "Is lesser than",
            "days_before": "Is x days before"
        },
        "ERRORS": {
            "VALUE_REQUIRED": "Value is required"
        },
        "ATTRIBUTES": {
            "NAME": "Name",
            "EMAIL": "Email",
            "PHONE_NUMBER": "Phone number",
            "IDENTIFIER": "Identifier",
            "CITY": "City",
            "COUNTRY": "Country",
            "CUSTOM_ATTRIBUTE_LIST": "List",
            "CUSTOM_ATTRIBUTE_TEXT": "Text",
            "CUSTOM_ATTRIBUTE_NUMBER": "Number",
            "CUSTOM_ATTRIBUTE_LINK": "Link",
            "CUSTOM_ATTRIBUTE_CHECKBOX": "Checkbox",
            "CREATED_AT": "Created At",
            "LAST_ACTIVITY": "Last Activity",
            "REFERER_LINK": "Referrer link",
            "BLOCKED": "Blocked",
            "LABELS": "Labels"
        },
        "GROUPS": {
            "STANDARD_FILTERS": "Standard Filters",
            "ADDITIONAL_FILTERS": "Additional Filters",
            "CUSTOM_ATTRIBUTES": "Custom Attributes"
        }
    },
    "CONTACTS_LAYOUT": {
        "HEADER": {
            "TITLE": "Friends",
            "SEARCH_TITLE": "Search people",
            "ACTIVE_TITLE": "Active now",
            "SEARCH_PLACEHOLDER": "Search...",
            "MESSAGE_BUTTON": "Message",
            "SEND_MESSAGE": "Send message",
            "BLOCK_CONTACT": "Block",
            "UNBLOCK_CONTACT": "Unblock",
            "BREADCRUMB": {
                "CONTACTS": "Friends"
            },
            "ACTIONS": {
                "CONTACT_CREATION": {
                    "ADD_CONTACT": "Add person",
                    "EXPORT_CONTACT": "Export list",
                    "IMPORT_CONTACT": "Import list",
                    "SAVE_CONTACT": "Save",
                    "EMAIL_ADDRESS_DUPLICATE": "This email address already belongs to another profile.",
                    "PHONE_NUMBER_DUPLICATE": "This phone number already belongs to another profile.",
                    "SUCCESS_MESSAGE": "Saved successfully",
                    "ERROR_MESSAGE": "Unable to save. Please try again later."
                },
                "BLOCK_SUCCESS_MESSAGE": "This person is blocked",
                "BLOCK_ERROR_MESSAGE": "Unable to block. Please try again later.",
                "UNBLOCK_SUCCESS_MESSAGE": "This person is unblocked",
                "UNBLOCK_ERROR_MESSAGE": "Unable to unblock. Please try again later.",
                "IMPORT_CONTACT": {
                    "TITLE": "Import list",
                    "DESCRIPTION": "Import a list from a CSV file.",
                    "DOWNLOAD_LABEL": "Download a sample csv.",
                    "LABEL": "CSV File:",
                    "CHOOSE_FILE": "Choose file",
                    "CHANGE": "Change",
                    "CANCEL": "Cancel",
                    "IMPORT": "Import",
                    "SUCCESS_MESSAGE": "You will be notified via email when the import is complete.",
                    "ERROR_MESSAGE": "There was an error, please try again",
                    "STATUS": {
                        "PENDING": "Import queued...",
                        "PROCESSING": "Importing list...",
                        "COMPLETED": "Imported {processed} of {total} rows.",
                        "FAILED": "The import failed."
                    },
                    "DOWNLOAD_FAILED_RECORDS": "Download the rows that could not be imported"
                },
                "EXPORT_CONTACT": {
                    "TITLE": "Export list",
                    "DESCRIPTION": "Quickly export a CSV file with full details of everyone on your list",
                    "CONFIRM": "Export",
                    "SUCCESS_MESSAGE": "Export is in progress. We will email you a download link when the export file is ready.",
                    "ERROR_MESSAGE": "There was an error, please try again"
                },
                "SORT_BY": {
                    "LABEL": "Sort by",
                    "OPTIONS": {
                        "NAME": "Name",
                        "EMAIL": "Email",
                        "PHONE_NUMBER": "Phone number",
                        "COMPANY": "Company",
                        "COUNTRY": "Country",
                        "CITY": "City",
                        "LAST_ACTIVITY": "Last activity",
                        "CREATED_AT": "Created at"
                    }
                },
                "ORDER": {
                    "LABEL": "Ordering",
                    "OPTIONS": {
                        "ASCENDING": "Ascending",
                        "DESCENDING": "Descending"
                    }
                },
                "FILTERS": {
                    "CREATE_SEGMENT": {
                        "TITLE": "Do you want to save this filter?",
                        "CONFIRM": "Save filter",
                        "LABEL": "Name",
                        "PLACEHOLDER": "Enter the name of the filter",
                        "ERROR": "Enter a valid name",
                        "SUCCESS_MESSAGE": "Filter saved successfully",
                        "ERROR_MESSAGE": "Unable to save filter. Please try again later."
                    },
                    "DELETE_SEGMENT": {
                        "TITLE": "Confirm Deletion",
                        "DESCRIPTION": "Are you sure you want to delete this filter?",
                        "CONFIRM": "Yes, Delete",
                        "CANCEL": "No, Cancel",
                        "SUCCESS_MESSAGE": "Filter deleted successfully",
                        "ERROR_MESSAGE": "Unable to delete filter. Please try again later."
                    }
                }
            }
        },
        "PAGINATION_FOOTER": {
            "SHOWING": "Showing {startItem} - {endItem} of {totalItems} person | Showing {startItem} - {endItem} of {totalItems} people"
        },
        "FILTER": {
            "NAME": "Name",
            "EMAIL": "Email",
            "PHONE_NUMBER": "Phone number",
            "IDENTIFIER": "Identifier",
            "COUNTRY": "Country",
            "CITY": "City",
            "COMPANY": "Company",
            "CREATED_AT": "Created at",
            "LAST_ACTIVITY": "Last activity",
            "REFERER_LINK": "Referer link",
            "BLOCKED": "Blocked",
            "BLOCKED_TRUE": "True",
            "BLOCKED_FALSE": "False",
            "BUTTONS": {
                "CLEAR_FILTERS": "Clear filters",
                "UPDATE_SEGMENT": "Update segment",
                "APPLY_FILTERS": "Apply filters",
                "ADD_FILTER": "Add filter"
            },
            "TITLE": "Filter list",
            "EDIT_SEGMENT": "Edit segment",
            "SEGMENT": {
                "LABEL": "Segment name",
                "INPUT_PLACEHOLDER": "Enter the name of the segment"
            },
            "ACTIVE_FILTERS": {
                "MORE_FILTERS": "+ {count} more filters",
                "CLEAR_FILTERS": "Clear filters"
            }
        },
        "FRIENDS": {
            "TITLE": "Friends",
            "TABS": {
                "ONLINE": "Online",
                "ALL": "All",
                "PENDING": "Pending"
            },
            "ADD_FRIEND": "Add Friend",
            "SEARCH_PLACEHOLDER": "Search",
            "SECTION": "{label} — {count}",
            "STATUS_ONLINE": "Online",
            "STATUS_OFFLINE": "Offline",
            "MESSAGE": "Message",
            "MORE": "More",
            "VIEW_PROFILE": "View profile",
            "REMOVE": "Remove from list",
            "EMPTY": {
                "ONLINE": "No friends are online right now.",
                "ALL": "No friends yet. Use Add Friend to find people by @username.",
                "PENDING": "Nobody is waiting on you.",
                "SEARCH": "Nobody matches that search."
            }
        },
        "IDENTIFICATION": {
            "ALL": "All",
            "IDENTIFIED": "Identified",
            "UNIDENTIFIED": "Unidentified"
        },
        "CARD": {
            "OF": "of",
            "UNIDENTIFIED_BADGE": "Unidentified",
            "UNIDENTIFIED_HINT": "No email, phone number or identifier yet — known only through the messaging channel.",
            "VIEW_DETAILS": "View details",
            "EDIT_DETAILS_FORM": {
                "TITLE": "Personal info",
                "FORM": {
                    "FIRST_NAME": {
                        "PLACEHOLDER": "Enter the first name"
                    },
                    "LAST_NAME": {
                        "PLACEHOLDER": "Enter the last name"
                    },
                    "EMAIL_ADDRESS": {
                        "PLACEHOLDER": "Enter the email address",
                        "DUPLICATE": "This email address already belongs to another profile."
                    },
                    "PHONE_NUMBER": {
                        "PLACEHOLDER": "Enter the phone number",
                        "DUPLICATE": "This phone number already belongs to another profile."
                    },
                    "CITY": {
                        "PLACEHOLDER": "Enter the city name"
                    },
                    "COUNTRY": {
                        "PLACEHOLDER": "Select country"
                    },
                    "BIO": {
                        "PLACEHOLDER": "Enter the bio"
                    },
                    "COMPANY_NAME": {
                        "PLACEHOLDER": "Enter the company name"
                    }
                },
                "UPDATE_BUTTON": "Save changes",
                "SUCCESS_MESSAGE": "Changes saved",
                "ERROR_MESSAGE": "Unable to save changes. Please try again later."
            },
            "SOCIAL_MEDIA": {
                "TITLE": "Edit social links",
                "FORM": {
                    "FACEBOOK": {
                        "PLACEHOLDER": "Add Facebook"
                    },
                    "GITHUB": {
                        "PLACEHOLDER": "Add Github"
                    },
                    "INSTAGRAM": {
                        "PLACEHOLDER": "Add Instagram"
                    },
                    "TELEGRAM": {
                        "PLACEHOLDER": "Add Telegram"
                    },
                    "TIKTOK": {
                        "PLACEHOLDER": "Add TikTok"
                    },
                    "LINKEDIN": {
                        "PLACEHOLDER": "Add LinkedIn"
                    },
                    "TWITTER": {
                        "PLACEHOLDER": "Add Twitter"
                    }
                }
            },
            "DELETE_CONTACT": {
                "MESSAGE": "This action is permanent and irreversible.",
                "BUTTON": "Delete now"
            }
        },
        "DETAILS": {
            "CREATED_AT": "Created {date}",
            "LAST_ACTIVITY": "Last active {date}",
            "DELETE_CONTACT_DESCRIPTION": "Permanently remove this person from your list. This action is irreversible.",
            "DELETE_CONTACT": "Remove from list",
            "DELETE_DIALOG": {
                "TITLE": "Confirm Deletion",
                "DESCRIPTION": "Are you sure you want to remove this person from your list?",
                "CONFIRM": "Yes, Delete",
                "API": {
                    "SUCCESS_MESSAGE": "Removed from your list",
                    "ERROR_MESSAGE": "Could not remove. Please try again later."
                }
            },
            "AVATAR": {
                "UPLOAD": {
                    "ERROR_MESSAGE": "Could not upload avatar. Please try again later.",
                    "SUCCESS_MESSAGE": "Avatar uploaded successfully"
                },
                "DELETE": {
                    "SUCCESS_MESSAGE": "Avatar deleted successfully",
                    "ERROR_MESSAGE": "Could not delete avatar. Please try again later."
                }
            }
        },
        "SIDEBAR": {
            "TABS": {
                "ATTRIBUTES": "Attributes",
                "HISTORY": "History",
                "NOTES": "Notes",
                "MEDIA": "Media",
                "MERGE": "Merge profiles"
            },
            "HISTORY": {
                "EMPTY_STATE": "No previous conversations with this person"
            },
            "ATTRIBUTES": {
                "SEARCH_PLACEHOLDER": "Search for attributes",
                "UNUSED_ATTRIBUTES": "{count} Used attribute | {count} Unused attributes",
                "EMPTY_STATE": "There are no custom attributes yet. You can create one in settings.",
                "YES": "Yes",
                "NO": "No",
                "TRIGGER": {
                    "SELECT": "Select value",
                    "INPUT": "Enter value"
                },
                "VALIDATIONS": {
                    "INVALID_NUMBER": "Invalid number",
                    "REQUIRED": "Valid value is required",
                    "INVALID_INPUT": "Invalid input",
                    "INVALID_URL": "Invalid URL",
                    "INVALID_DATE": "Invalid date"
                },
                "NO_ATTRIBUTES": "No attributes found",
                "API": {
                    "SUCCESS_MESSAGE": "Attribute updated successfully",
                    "DELETE_SUCCESS_MESSAGE": "Attribute deleted successfully",
                    "UPDATE_ERROR": "Unable to update attribute. Please try again later",
                    "DELETE_ERROR": "Unable to delete attribute. Please try again later"
                }
            },
            "MERGE": {
                "TITLE": "Merge profiles",
                "DESCRIPTION": "Combine two profiles into one, including all attributes and conversations. In case of conflict, the primary profile’s attributes will take precedence.",
                "PRIMARY": "Primary profile",
                "PRIMARY_HELP_LABEL": "To be saved",
                "PRIMARY_REQUIRED_ERROR": "Please select a profile to merge with before proceeding",
                "PARENT": "To be merged",
                "PARENT_HELP_LABEL": "To be deleted",
                "EMPTY_STATE": "No one found",
                "PLACEHOLDER": "Search for the primary profile",
                "SEARCH_PLACEHOLDER": "Search for a profile",
                "SEARCH_ERROR_MESSAGE": "Could not search. Please try again later.",
                "SUCCESS_MESSAGE": "Profiles merged",
                "ERROR_MESSAGE": "Could not merge profiles, try again!",
                "IS_SEARCHING": "Searching...",
                "BUTTONS": {
                    "CANCEL": "Cancel",
                    "CONFIRM": "Merge profiles"
                }
            },
            "NOTES": {
                "PLACEHOLDER": "Add a note",
                "WROTE": "wrote",
                "YOU": "You",
                "SAVE": "Save note",
                "ADD_NOTE": "Add a note for this person",
                "EXPAND": "Expand",
                "COLLAPSE": "Collapse",
                "NO_NOTES": "No notes, you can add notes from the profile page.",
                "EMPTY_STATE": "This person has no notes yet. You can add a note by typing in the box above.",
                "CONVERSATION_EMPTY_STATE": "There are no notes yet. Use the Add note button to create one."
            }
        },
        "EMPTY_STATE": {
            "TITLE": "Your list is empty",
            "SUBTITLE": "Click the button below to add your first person",
            "BUTTON_LABEL": "Add person",
            "SEARCH_EMPTY_STATE_TITLE": "No one matches your search 🔍",
            "LIST_EMPTY_STATE_TITLE": "No one in this list yet 📋",
            "ACTIVE_EMPTY_STATE_TITLE": "No one is active at the moment 🌙"
        },
        "LOAD_MORE": "Load more"
    },
    "CONTACTS_PAGE": {
        "LIST": {
            "TABLE_HEADER": {
                "SOCIAL_PROFILES": "Social Profiles"
            }
        }
    },
    "CONVERSATION": {
        "REFERRAL": {
            "AD_LABEL": "Ad",
            "POST_LABEL": "Post",
            "VIEW_AD": "View ad",
            "WELCOME_MESSAGE_LABEL": "Pre-filled message: ",
            "REPLIED_BELOW": "Customer replied below"
        },
        "SELECT_A_CONVERSATION": "Please select a conversation from left pane",
        "CSAT_REPLY_MESSAGE": "Please rate the conversation",
        "404": "Sorry, we cannot find the conversation. Please try again",
        "SWITCH_VIEW_LAYOUT": "Switch the layout",
        "DASHBOARD_APP_TAB_MESSAGES": "Messages",
        "UNVERIFIED_SESSION": "The identity of this user is not verified",
        "NO_MESSAGE_1": "Uh oh! Looks like there are no messages from customers in your inbox.",
        "NO_MESSAGE_2": " to send a message to your page!",
        "NO_INBOX_1": "Hola! Looks like you haven't added any inboxes yet.",
        "NO_INBOX_2": " to get started",
        "NO_INBOX_AGENT": "Uh Oh! Looks like you are not part of any inbox. Please contact your administrator",
        "SEARCH_MESSAGES": "Search for messages in conversations",
        "VIEW_ORIGINAL": "View original",
        "VIEW_TRANSLATED": "View translated",
        "EMPTY_STATE": {
            "CMD_BAR": "to open command menu",
            "KEYBOARD_SHORTCUTS": "to view keyboard shortcuts"
        },
        "SEARCH": {
            "TITLE": "Search messages",
            "RESULT_TITLE": "Search Results",
            "LOADING_MESSAGE": "Crunching data...",
            "PLACEHOLDER": "Type any text to search messages",
            "NO_MATCHING_RESULTS": "No results found."
        },
        "UNREAD_MESSAGES": "Unread Messages",
        "UNREAD_MESSAGE": "Unread Message",
        "CLICK_HERE": "Click here",
        "LOADING_INBOXES": "Loading inboxes",
        "LOADING_CONVERSATIONS": "Loading Conversations",
        "CANNOT_REPLY": "You cannot reply due to",
        "24_HOURS_WINDOW": "24 hour message window restriction",
        "48_HOURS_WINDOW": "48 hour message window restriction",
        "API_HOURS_WINDOW": "You can only reply to this conversation within {hours} hours",
        "NOT_ASSIGNED_TO_YOU": "This conversation is not assigned to you. Would you like to assign this conversation to yourself?",
        "ASSIGN_TO_ME": "Assign to me",
        "BOT_HANDOFF_MESSAGE": "This conversation is currently handled by {assigneeName}.",
        "BOT_HANDOFF_FALLBACK_ASSIGNEE": "a bot",
        "BOT_HANDOFF_ACTION": "Take over",
        "BOT_HANDOFF_REOPEN_ACTION": "Mark conversation open",
        "BOT_HANDOFF_SUCCESS": "Conversation has been handed over to you",
        "BOT_HANDOFF_ERROR": "Failed to take over the conversation. Please try again.",
        "TWILIO_WHATSAPP_CAN_REPLY": "You can only reply to this conversation using a template message due to",
        "TWILIO_WHATSAPP_24_HOURS_WINDOW": "24 hour message window restriction",
        "OLD_INSTAGRAM_INBOX_REPLY_BANNER": "This Instagram account was migrated to the new Instagram channel inbox. All new messages will show up there. You won’t be able to send messages from this conversation anymore.",
        "INSTAGRAM_RESTRICTION_BANNER": "Instagram messaging is currently affected by an API-level issue on Meta’s side, not a problem with {installationName}. Some messages or actions may be delayed or unavailable. We’re working closely with Meta to resolve it as quickly as possible.",
        "INSTAGRAM_RESTRICTION_STATUS_LINK": "View status updates",
        "REPLYING_TO": "You are replying to:",
        "REMOVE_SELECTION": "Remove Selection",
        "DOWNLOAD": "Download",
        "UNKNOWN_FILE_TYPE": "Unknown File",
        "SAVE_CONTACT": "Save Contact",
        "NO_CONTENT": "No content to display",
        "MESSAGE_DELETED": "This message was deleted",
        "SHARED_ATTACHMENT": {
            "CONTACT": "{sender} has shared a contact",
            "LOCATION": "{sender} has shared a location",
            "FILE": "{sender} has shared a file",
            "MEETING": "{sender} has started a meeting",
            "BUSINESS_CARD": "{sender} has shared a contact card",
            "BANK_CARD": "{sender} has shared a bank account",
            "REMINDER": "{sender} has created a reminder",
            "FRIEND_REQUEST": "{sender} has sent a friend request"
        },
        "ZALO": {
            "BUSINESS_CARD": {
                "FALLBACK_NAME": "Contact card",
                "VIEW_PROFILE": "View profile"
            },
            "BANK_CARD": {
                "FALLBACK_NAME": "Bank account",
                "COPY_ACCOUNT_NUMBER": "Copy account number",
                "COPIED": "Copied"
            },
            "REMINDER": {
                "FALLBACK_TITLE": "Reminder"
            },
            "CALL": {
                "VOICE": "Voice call",
                "VIDEO": "Video call",
                "MISSED": "missed",
                "BUSY": "busy",
                "CANCELED": "canceled"
            }
        },
        "LINK_PREVIEW": {
            "FALLBACK_TITLE": "Link"
        },
        "FRIEND_REQUEST": {
            "TITLE": "Friend request"
        },
        "SEND_CARD": {
            "BUTTON": "Send a card",
            "PREVIEW": "What the customer sees",
            "PREVIEW_EMPTY": "Fill in the form to preview",
            "SEND": "Send",
            "CANCEL": "Cancel",
            "REMOVE": "Remove",
            "REVIEW_TITLE": "Review the card before sending",
            "REVIEW_HINT": "Card from a canned response — review it, then press Send.",
            "SAVE_AS_CANNED": "Save as a canned response",
            "SAVE_AS_CANNED_LABEL": "Short code",
            "SAVE_AS_CANNED_PLACEHOLDER": "e.g. bank-transfer-deposit",
            "SAVE_AS_CANNED_SUCCESS": "Saved as a canned response.",
            "SAVE_AS_CANNED_ERROR": "Could not save, please try again.",
            "QUICK_REPLIES": {
                "TITLE": "Quick replies",
                "HINT": "A question with 2–6 options to tap",
                "QUESTION": "Question",
                "OPTIONS": "Options",
                "OPTION": "Option {index}",
                "ADD_OPTION": "Add option"
            },
            "PRODUCT": {
                "TITLE": "Product card",
                "HINT": "Image, price, variants and an Order button",
                "NAME": "Product name",
                "UPLOAD_IMAGE": "Upload image",
                "CHANGE_IMAGE": "Change image",
                "UPLOADING": "Uploading…",
                "PRICE": "Price (VND)",
                "COMPARE_AT": "Original price (VND)",
                "STOCK_LABEL": "Stock line",
                "STOCK_PLACEHOLDER": "2 left",
                "MAX_QUANTITY": "Max quantity",
                "VARIANTS": "Variants",
                "VARIANT_NAME": "Group name",
                "VARIANT_NAME_PLACEHOLDER": "Colour",
                "VARIANT_OPTIONS": "Options, separated by commas",
                "VARIANT_OPTIONS_PLACEHOLDER": "Blue, Ivory, Jade",
                "ADD_VARIANT": "Add variant group",
                "LINK": "Product link on your website (optional)",
                "ORDER_BUTTON": "Order",
                "VIEW_BUTTON": "View"
            },
            "BANK_TRANSFER": {
                "TITLE": "Bank transfer card",
                "HINT": "VietQR code, account number, amount and memo",
                "ACCOUNT": "Receiving account",
                "AMOUNT": "Amount (VND, optional)",
                "AMOUNT_PLACEHOLDER": "Leave empty to let the customer enter it",
                "MEMO": "Transfer memo",
                "MEMO_HINT": "Banks only read unaccented text, up to 25 characters; Yona strips accents for you.",
                "NO_ACCOUNTS": "No receiving account you are allowed to send yet. An administrator can add one in Settings → Bank transfer.",
                "ADD_ACCOUNT": "Add receiving account",
                "NEW_ACCOUNT_TITLE": "New receiving account"
            },
            "SCHEDULE": {
                "TITLE": "Delivery time picker",
                "HINT": "The customer picks a day and time slot on a separate page",
                "TITLE_LABEL": "Title",
                "SLOTS": "Time slots",
                "DATE": "Date",
                "TIME": "Time slot",
                "TIME_PLACEHOLDER": "8:00 to 10:00",
                "ADD_SLOT": "Add time slot",
                "NOTE": "Note for the customer (optional)",
                "NOTE_PLACEHOLDER": "Order #GM1024, to 12 Hang Bong"
            },
            "ERRORS": {
                "ACCOUNT_REQUIRED": "Choose a receiving account",
                "AMOUNT_INVALID": "The amount is not valid",
                "SLOTS_REQUIRED": "Add at least one slot with a date and time",
                "QUESTION_REQUIRED": "A question is required",
                "TOO_FEW_OPTIONS": "Add at least 2 options",
                "OPTION_TOO_LONG": "Each option is at most 80 characters",
                "DUPLICATE_OPTION": "Two options are the same",
                "TITLE_REQUIRED": "A product name is required",
                "COMPARE_AT_INVALID": "The original price must be higher than the price",
                "LINK_INVALID": "Links must start with http:// or https://",
                "VARIANT_EMPTY": "A variant group needs at least one option"
            }
        },
        "STRUCTURED": {
            "CHOICE_OF": "Reply to: {question}",
            "DELIVERY": {
                "TEXT_NUMBERED": "No buttons on this channel: the customer got text with a numbered list",
                "TEXT": "This channel can't show cards: the customer got a text version",
                "IMAGE_TEXT": "This channel can't show cards: the customer got a card image with text"
            },
            "MARK_BANK_TRANSFER_PAID": "Mark as paid"
        },
        "SENT_FROM_NATIVE_APP": "via {source}",
        "SENT_OUTSIDE_APP": "sent outside Yona",
        "MESSAGE_ACTIONS": {
            "REPLY": "Reply",
            "MORE": "More actions",
            "REACT": "React",
            "FORWARD": "Forward",
            "EDITED": "Edited",
            "EDIT": "Edit",
            "RECALL": "Unsend for everyone",
            "DELETE": "Delete",
            "COPIED": "Message text copied",
            "COPY_FAILED": "Could not copy. Please try again.",
            "TRANSLATION": {
                "LOADING": "Translating…",
                "FAILED": "Could not translate this message. Please try again later.",
                "CLOSE": "Close"
            },
            "RECALL_CONFIRMATION": {
                "TITLE": "Unsend this message for everyone?",
                "MESSAGE": "The message disappears on the customer's side too. This cannot be undone."
            }
        },
        "REACTIONS": {
            "TITLE": "Reactions",
            "YOU": "You",
            "TAP_TO_REMOVE": "Tap to remove",
            "SUMMARY": "{count} reactions, tap to see who reacted"
        },
        "REPLY_QUOTE": {
            "ORIGINAL": "Original message",
            "JUMP": "Go to original message"
        },
        "FORWARD": {
            "TITLE": "Forward message",
            "SEARCH_PLACEHOLDER": "Search by name, phone or conversation ID",
            "RECENT": "Recent conversations",
            "EMPTY": "No conversations found",
            "LOAD_FAILED": "Could not load conversations.",
            "RETRY": "Retry",
            "MAX_REACHED": "You can forward to at most {max} conversations at a time",
            "SUBMIT_COUNT": "Forward ({count})",
            "SUCCESS": "Forwarded to {count} conversation | Forwarded to {count} conversations",
            "OPEN": "Open conversation",
            "PARTIAL": "Forwarded to {ok}/{total} conversations. {error}",
            "FAILED": "Could not forward. {error}",
            "REMOVE_TARGET": "Remove {name}"
        },
        "FORWARDED": {
            "LABEL": "Forwarded",
            "FROM": "Forwarded from {name}",
            "SOURCE_CONVERSATION": "Forwarded from conversation #{id}",
            "PREPARING_DOCUMENT": "Preparing the email PDF"
        },
        "MESSAGE_FAILURE": {
            "RETRY": "Retry sending",
            "RETRY_FAILED": "Could not resend the message. Please try again.",
            "HINT": {
                "session_lost": "The channel connection was lost. Reconnect the inbox, then retry.",
                "circuit_open": "Sending is paused after repeated failures. Retry in a few minutes.",
                "bridge_unreachable": "The channel service could not be reached. Retry in a moment.",
                "secret_mismatch": "The channel is misconfigured. Ask an administrator to check it — retrying will not help.",
                "media_fetch_failed": "The attachment could not be read. Send the file again.",
                "email_bounced": "The customer's address does not accept mail — retrying will not deliver it. Fix the customer's email, then send again."
            }
        },
        "MESSAGE_SENDER": {
            "IN_GROUP": "Sent in the group by {name}"
        },
        "UPLOADING_ATTACHMENTS": "Uploading attachments...",
        "REPLIED_TO_STORY": "Replied to your story",
        "UNSUPPORTED_MESSAGE": "This message is unsupported. To view it, please open it on the original platform.",
        "UNSUPPORTED_MESSAGE_FACEBOOK": "This message is unsupported. You can view this message on the Facebook Messenger app.",
        "UNSUPPORTED_MESSAGE_INSTAGRAM": "This message is unsupported. You can view this message on the Instagram app.",
        "UNSUPPORTED_MESSAGE_TIKTOK": "This message is unsupported. You can view this message on the TikTok app.",
        "UNSUPPORTED_MESSAGE_WHATSAPP": "This message is unsupported. You can view this message on the WhatsApp app.",
        "WHATSAPP_FLOW_RESPONSE": "Submitted a flow response",
        "WHATSAPP_REFERRAL": {
            "AD": "Ad"
        },
        "SUCCESS_DELETE_MESSAGE": "Message deleted successfully",
        "FAIL_DELETE_MESSSAGE": "Couldn't delete message! Try again",
        "NO_RESPONSE": "No response",
        "RESPONSE": "Response",
        "RATING_TITLE": "Rating",
        "FEEDBACK_TITLE": "Feedback",
        "REPLY_MESSAGE_NOT_FOUND": "Message not available",
        "JUMP_TO_MESSAGE_NOT_FOUND": "This message is no longer in this conversation",
        "SCROLL_TO_LATEST": "Jump to latest message",
        "SCROLL_TO_LATEST_UNSEEN": "{count} new",
        "CAPTAIN_GENERATION": {
            "TITLE": "How was this reply generated?",
            "GENERATED_BY": "Generated by Captain",
            "LOADING": "Loading details…",
            "EMPTY": "No generation details available for this message.",
            "TIMELINE": "Generation steps",
            "STEP_TOOL": "Called {name}",
            "STEP_HANDOFF": "Handed off to {name}",
            "REASONING": "Reasoning",
            "SOURCES": "Knowledge base",
            "SOURCES_SUMMARY": "{count} result | {count} results",
            "MODEL": "Generated with {model}",
            "CREDITS": "Credits: {credits}"
        },
        "CARD": {
            "SHOW_LABELS": "Show labels",
            "HIDE_LABELS": "Hide labels",
            "LABELS_COUNT": "{count} labels"
        },
        "VOICE_CALL": {
            "INCOMING_CALL": "Incoming call",
            "OUTGOING_CALL": "Outgoing call",
            "CALL_IN_PROGRESS": "Call in progress",
            "NO_ANSWER": "No answer",
            "NO_ANSWER_OUTBOUND_LABEL": "No answer",
            "NO_ANSWER_OUTBOUND_SUBTEXT": "Contact didn't pick up",
            "MISSED_CALL": "Missed call",
            "MISSED_CALL_INBOUND_SUBTEXT": "No agent picked up",
            "MISSED_CALL_DECLINED_BY": "Declined by {agentName}",
            "CALL_ENDED": "Call ended",
            "HANDLED_BY": "Handled by {agentName}",
            "NOT_ANSWERED_YET": "Not answered yet",
            "CALLING": "Calling…",
            "THEY_ANSWERED": "They answered",
            "YOU_ANSWERED": "You answered",
            "AGENT_ANSWERED": "{agentName} answered",
            "JOIN_CALL": "Join call",
            "CALL_BACK": "Call back",
            "TRANSCRIPT_SHOW_MORE": "Show more",
            "TRANSCRIPT_SHOW_LESS": "Show less"
        },
        "SEARCH_IN_CONVERSATION": {
            "OPEN": "Search in conversation",
            "PLACEHOLDER": "Search in conversation",
            "OLDER": "Older result (Enter)",
            "NEWER": "Newer result (Shift+Enter)",
            "CLOSE": "Close search (Esc)",
            "NO_RESULTS": "No results",
            "ERROR": "Error, try again"
        },
        "HEADER": {
            "RESOLVE_ACTION": "Resolve",
            "REOPEN_ACTION": "Reopen",
            "OPEN_ACTION": "Open",
            "MORE_ACTIONS": "More actions",
            "OPEN": "More",
            "CLOSE": "Close",
            "DETAILS": "details",
            "COPY_ID_SUCCESS": "Conversation ID copied to clipboard",
            "SNOOZED_UNTIL": "Snoozed until",
            "SNOOZED_UNTIL_TOMORROW": "Snoozed until tomorrow",
            "SNOOZED_UNTIL_NEXT_WEEK": "Snoozed until next week",
            "SNOOZED_UNTIL_NEXT_REPLY": "Snoozed until next reply",
            "WHATSAPP_CALL": "Start WhatsApp call",
            "WHATSAPP_CALL_FAILED": "Could not start the WhatsApp call.",
            "VOICE_CALL": "Start call",
            "VOICE_CALL_FAILED": "Could not start the call.",
            "WHATSAPP_CALL_PERMISSION_REQUESTED": "Sent a call permission request to the contact. Try again once they accept.",
            "WHATSAPP_CALL_PERMISSION_PENDING": "Call permission request already sent recently. Try again once the contact accepts.",
            "SLA_STATUS": {
                "FRT": "FRT {status}",
                "NRT": "NRT {status}",
                "RT": "RT {status}",
                "MISSED": "missed",
                "DUE": "due"
            }
        },
        "ASSIGNEE": {
            "OWNED_BY_ME": "Assignee: You",
            "OWNED_BY": "Assignee: {name}",
            "UNASSIGNED": "No assignee",
            "YOU": "You",
            "UNASSIGNED_SHORT": "Unassigned",
            "CHANGE": "Change assignee",
            "ASSIGN_TO": "Assign to",
            "ASSIGN_TO_ME": "Assign to me",
            "UNASSIGN": "Unassign"
        },
        "RESOLVE_DROPDOWN": {
            "MARK_PENDING": "Mark as pending",
            "SNOOZE_UNTIL": "Snooze…",
            "MARK_UNREAD": "Mark as unread",
            "CHANGE_STATUS": "Change conversation status",
            "CURRENT_STATUS": {
                "open": "Open",
                "resolved": "Resolved",
                "pending": "Pending",
                "snoozed": "Snoozed"
            },
            "SNOOZE": {
                "TITLE": "Snooze until",
                "NEXT_REPLY": "Next reply",
                "TOMORROW": "Tomorrow",
                "NEXT_WEEK": "Next week"
            }
        },
        "MENTION": {
            "AGENTS": "Agents",
            "TEAMS": "Teams"
        },
        "PICKER": {
            "VARIABLE": {
                "SEARCH_PLACEHOLDER": "Search variables",
                "DESCRIPTION": "Description",
                "VALUE": "Value",
                "NO_VALUE": "No value for this conversation"
            },
            "EMOJI": {
                "SEARCH_PLACEHOLDER": "Search emojis",
                "EMPTY_STATE": "Type to search emojis"
            },
            "MACRO": {
                "SEARCH_PLACEHOLDER": "Search macros",
                "ACTION_COUNT": "1 action | {count} actions"
            },
            "MENTION": {
                "SEARCH_PLACEHOLDER": "Search agents and teams",
                "FILTER": {
                    "ALL": "All"
                },
                "AVAILABILITY": "Availability",
                "ROLE": "Role",
                "AUTO_ASSIGN": "Auto assign",
                "ENABLED": "Enabled",
                "DISABLED": "Disabled",
                "YOU_ARE_A_MEMBER": "You are a member of this team"
            },
            "GROUP_MEMBER": {
                "TITLE": "Group members",
                "EVERYONE_HINT": "Notify everyone in the group",
                "EVERYONE_ALIAS": "Everyone"
            }
        },
        "CUSTOM_SNOOZE": {
            "TITLE": "Snooze until",
            "APPLY": "Snooze",
            "CANCEL": "Cancel"
        },
        "PRIORITY": {
            "TITLE": "Priority",
            "OPTIONS": {
                "NONE": "None",
                "URGENT": "Urgent",
                "HIGH": "High",
                "MEDIUM": "Medium",
                "LOW": "Low"
            },
            "CHANGE_PRIORITY": {
                "SELECT_PLACEHOLDER": "None",
                "INPUT_PLACEHOLDER": "Select priority",
                "NO_RESULTS": "No results found",
                "SUCCESSFUL": "Changed priority of conversation id {conversationId} to {priority}",
                "FAILED": "Couldn't change priority. Please try again."
            }
        },
        "DELETE_CONVERSATION": {
            "TITLE": "Delete conversation #{conversationId}",
            "DESCRIPTION": "Are you sure you want to delete this conversation?",
            "CONFIRM": "Delete"
        },
        "CARD_CONTEXT_MENU": {
            "PIN": "Pin conversation",
            "UNPIN": "Unpin conversation",
            "PIN_ERROR": "Couldn't pin the conversation. Please try again.",
            "UNPIN_ERROR": "Couldn't unpin the conversation. Please try again.",
            "MOVE_PIN_TOP": "Move to top of pinned",
            "MOVE_PIN_UP": "Move up",
            "MOVE_PIN_DOWN": "Move down",
            "REORDER_PIN_ERROR": "Couldn't reorder pinned conversations. Please try again.",
            "DRAG_PIN_HINT": "Drag a pinned conversation card to reorder the pinned group.",
            "PINNED": "Pinned",
            "MORE_ACTIONS": "Conversation actions",
            "PENDING": "Mark as pending",
            "RESOLVED": "Mark as resolved",
            "MARK_AS_UNREAD": "Mark as unread",
            "MARK_AS_READ": "Mark as read",
            "REOPEN": "Reopen conversation",
            "SNOOZE": {
                "TITLE": "Snooze",
                "NEXT_REPLY": "Until next reply",
                "TOMORROW": "Until tomorrow",
                "NEXT_WEEK": "Until next week"
            },
            "ASSIGN_AGENT": "Assign agent",
            "ASSIGN_LABEL": "Assign label",
            "SEARCH_LABELS": "Search labels",
            "NO_LABELS_FOUND": "No labels found",
            "AGENTS_LOADING": "Loading agents...",
            "ASSIGN_TEAM": "Assign team",
            "DELETE": "Delete conversation",
            "OPEN_IN_NEW_TAB": "Open in new tab",
            "COPY_LINK": "Copy conversation link",
            "COPY_LINK_SUCCESS": "Conversation link copied to clipboard",
            "API": {
                "AGENT_ASSIGNMENT": {
                    "SUCCESFUL": "Conversation id {conversationId} assigned to \"{agentName}\"",
                    "FAILED": "Couldn't assign agent. Please try again."
                },
                "LABEL_ASSIGNMENT": {
                    "SUCCESFUL": "Assigned label #{labelName} to conversation id {conversationId}",
                    "FAILED": "Couldn't assign label. Please try again."
                },
                "LABEL_REMOVAL": {
                    "SUCCESFUL": "Removed label #{labelName} from conversation id {conversationId}",
                    "FAILED": "Couldn't remove label. Please try again."
                },
                "TEAM_ASSIGNMENT": {
                    "SUCCESFUL": "Assigned team \"{team}\" to conversation id {conversationId}",
                    "FAILED": "Couldn't assign team. Please try again."
                }
            }
        },
        "FOOTER": {
            "MESSAGE_SIGN_TOOLTIP": "Message signature",
            "ENABLE_SIGN_TOOLTIP": "Enable signature",
            "DISABLE_SIGN_TOOLTIP": "Disable signature",
            "MSG_INPUT": "Shift + enter for new line. Start with '/' to select a Canned Response.",
            "PRIVATE_MSG_INPUT": "Private note (Shift + enter for new line). Only you can see it",
            "MSG_INPUT_TOUCH": "Type a message…",
            "PRIVATE_MSG_INPUT_TOUCH": "Private note. Only you can see it",
            "MESSAGING_RESTRICTED": "You cannot reply to this conversation",
            "MESSAGING_RESTRICTED_WHATSAPP": "You can only reply using a template message due to 24-hour message window restriction",
            "MESSAGING_RESTRICTED_API": "You can only reply using a template message due to message window restriction",
            "MESSAGE_SIGNATURE_NOT_CONFIGURED": "Message signature is not configured, please configure it in profile settings.",
            "MESSAGE_SIGNATURE_NOT_CONFIGURED_SHORT": "No message signature yet — click to set one up",
            "RESIZE_COMPOSER": "Drag to resize the composer",
            "COPILOT_MSG_INPUT": "Give copilot additional prompts, or ask anything else... Press enter to send follow-up",
            "CLICK_HERE": "Click here to update",
            "WHATSAPP_TEMPLATES": "Whatsapp Templates"
        },
        "REPLYBOX": {
            "REPLY": "Reply",
            "PRIVATE_NOTE": "Private Note",
            "SEND": "Send",
            "CREATE": "Add Note",
            "INSERT_READ_MORE": "Read more",
            "DISMISS_REPLY": "Dismiss reply",
            "REPLYING_TO": "Replying to:",
            "TIP_EMOJI_ICON": "Show emoji selector",
            "TIP_STICKER_ICON": "Send a sticker",
            "TIP_ATTACH_ICON": "Attach files",
            "TIP_AUDIORECORDER_ICON": "Record audio",
            "TIP_AUDIORECORDER_PERMISSION": "Allow access to audio",
            "TIP_AUDIORECORDER_ERROR": "Could not open the audio",
            "AUDIO_CONVERSION_FAILED": "Audio conversion failed. Please try again.",
            "DRAG_DROP": "Drag and drop here to attach",
            "IMAGE_UPLOAD_SUCCESS": "Image uploaded successfully",
            "START_AUDIO_RECORDING": "Start audio recording",
            "STOP_AUDIO_RECORDING": "Stop audio recording",
            "VOICE_RECORDER": {
                "RECORDING": "Recording",
                "WAITING_FOR_PERMISSION": "Waiting for microphone permission…",
                "CANCEL": "Cancel",
                "PREVIEW": "Play back the recording",
                "DISCARD": "Delete",
                "SEND": "Send recording",
                "MAX_DURATION_REACHED": "Recording stopped at the {minutes}-minute limit. Play it back, then send.",
                "PERMISSION_DENIED": "Your browser has not allowed Yona to use the microphone. Click the lock icon next to the page address, allow Microphone, then try again.",
                "NO_MICROPHONE": "No microphone found. Plug in a microphone or headset, then try again.",
                "MICROPHONE_BUSY": "Another app is using the microphone (a call, a recorder…). Close it, then try again.",
                "UNSUPPORTED": "This browser cannot record audio. Use a recent version of Chrome, Edge, Firefox or Safari.",
                "FAILED": "Could not record audio. Please try again."
            },
            "COPILOT_THINKING": "Copilot is thinking",
            "EMAIL_HEAD": {
                "TO": "TO",
                "ADD_BCC": "Add bcc",
                "CC": {
                    "LABEL": "CC",
                    "PLACEHOLDER": "Emails separated by commas",
                    "ERROR": "Please enter valid email addresses"
                },
                "BCC": {
                    "LABEL": "BCC",
                    "PLACEHOLDER": "Emails separated by commas",
                    "ERROR": "Please enter valid email addresses"
                }
            },
            "UNDEFINED_VARIABLES": {
                "TITLE": "Undefined variables",
                "MESSAGE": "You have {undefinedVariablesCount} undefined variables in your message: {undefinedVariables}. Would you like to send the message anyway?",
                "CONFIRM": {
                    "YES": "Send",
                    "CANCEL": "Cancel"
                }
            },
            "QUOTED_REPLY": {
                "ENABLE_TOOLTIP": "Include quoted email thread",
                "DISABLE_TOOLTIP": "Don't include quoted email thread",
                "REMOVE_PREVIEW": "Remove quoted email thread",
                "COLLAPSE": "Collapse preview",
                "EXPAND": "Expand preview"
            }
        },
        "STICKER_PICKER": {
            "SEARCH_PLACEHOLDER": "Search stickers",
            "SUGGESTED_KEYWORDS": "thanks,hello,ok,haha,love,sad,sorry,congrats",
            "RECENT": "Recent",
            "PACK": "Sticker pack",
            "STICKER": "Sticker",
            "EMPTY_RECENT": "No recent stickers yet. Type a keyword or pick a suggestion to search.",
            "EMPTY_PACK": "This pack has no stickers yet.",
            "NO_RESULTS": "No stickers found for “{query}”.",
            "LOAD_FAILED": "Could not load stickers, please try again.",
            "RETRY": "Try again",
            "SUGGESTIONS": "Suggested stickers",
            "DISMISS_SUGGESTIONS": "Hide suggested stickers"
        },
        "VISIBLE_TO_AGENTS": "Private Note: Only visible to you and your team",
        "CHANGE_STATUS": "Conversation status changed",
        "CHANGE_STATUS_FAILED": "Conversation status change failed",
        "CHANGE_AGENT": "Conversation Assignee changed",
        "CHANGE_AGENT_FAILED": "Assignee change failed",
        "ASSIGN_LABEL_SUCCESFUL": "Label assigned successfully",
        "ASSIGN_LABEL_FAILED": "Label assignment failed",
        "CHANGE_TEAM": "Conversation team changed",
        "SUCCESS_DELETE_CONVERSATION": "Conversation deleted successfully",
        "FAIL_DELETE_CONVERSATION": "Couldn't delete conversation! Try again",
        "FILE_SIZE_LIMIT": "File exceeds the {MAXIMUM_SUPPORTED_FILE_UPLOAD_SIZE} MB attachment limit",
        "FILE_TYPE_NOT_SUPPORTED": "This {fileName} file type is not supported in this conversation",
        "MESSAGE_ERROR": "Unable to send this message, please try again later",
        "SENT_BY": "Sent by:",
        "SENT_VIA_PLATFORM": "via {platform}",
        "BOT": "Bot",
        "NATIVE_APP": "Native app",
        "NATIVE_APP_ADVISORY": "This message was sent directly from the {source} app, not through Yona.",
        "NATIVE_APP_ADVISORY_UNKNOWN_SOURCE": "This message was sent directly from the channel's own app, not through Yona.",
        "SEND_FAILED": "Couldn't send message! Try again",
        "TRY_AGAIN": "retry",
        "ASSIGNMENT": {
            "SELECT_AGENT": "Select Agent",
            "REMOVE": "Remove",
            "ASSIGN": "Assign"
        },
        "CONTEXT_MENU": {
            "COPY": "Copy text",
            "REPLY_TO": "Reply to this message",
            "DELETE": "Delete",
            "CREATE_A_CANNED_RESPONSE": "Create canned response",
            "TRANSLATE": "Translate",
            "COPY_PERMALINK": "Copy link to message",
            "OPEN_IN_SOURCE": "Open in {name}",
            "COPY_IMAGE": "Copy image",
            "IMAGE_COPIED": "Image copied",
            "LINK_COPIED": "Message link copied",
            "DELETE_CONFIRMATION": {
                "TITLE": "Are you sure you want to delete this message?",
                "MESSAGE": "You cannot undo this action",
                "DELETE": "Delete",
                "CANCEL": "Cancel"
            },
            "REPORT_MESSAGE": {
                "LABEL": "Report message",
                "TITLE": "Report Captain message",
                "DESCRIPTION": "Found an issue with this AI response? Let us know what went wrong and our team will review it to help improve Captain's accuracy.",
                "PROBLEM_TYPE": "Problem type",
                "PROBLEM_TYPE_PLACEHOLDER": "Select a problem type",
                "DESCRIPTION_LABEL": "Description",
                "DESCRIPTION_PLACEHOLDER": "Describe the problem in detail",
                "SUBMIT": "Report",
                "SUCCESS": "Thanks for reporting. Our team will take a look.",
                "ERROR": "Could not report this message. Please try again.",
                "REASONS": {
                    "incorrect_information": "Incorrect information",
                    "inappropriate_response": "Inappropriate response",
                    "incomplete_response": "Incomplete response",
                    "outdated_information": "Outdated information",
                    "other": "Other"
                }
            }
        },
        "SIDEBAR": {
            "CONTACT": "Details",
            "CLOSE_OVERLAY": "Close details panel",
            "COPILOT": "Copilot"
        },
        "VOICE_WIDGET": {
            "INCOMING_CALL": "Incoming call",
            "OUTGOING_CALL": "Outgoing call",
            "CALL_IN_PROGRESS": "Call in progress",
            "NOT_ANSWERED_YET": "Not answered yet",
            "HANDLED_IN_ANOTHER_TAB": "Being handled in another tab",
            "REJECT_CALL": "Reject",
            "DISMISS_CALL": "Dismiss",
            "JOIN_CALL": "Join call",
            "END_CALL": "End call",
            "MUTE": "Mute mic",
            "UNMUTE": "Unmute mic",
            "VIEW_CHAT_HISTORY": "View chat history",
            "GO_TO_CONVERSATION": "Go to conversation thread"
        }
    },
    "CONVERSATION_CUSTOM_ATTRIBUTES": {
        "ADD_BUTTON_TEXT": "Create attribute",
        "NO_RECORDS_FOUND": "No attributes found",
        "UPDATE": {
            "SUCCESS": "Attribute updated successfully",
            "ERROR": "Unable to update attribute. Please try again later"
        },
        "ADD": {
            "TITLE": "Add",
            "SUCCESS": "Attribute added successfully",
            "ERROR": "Unable to add attribute. Please try again later"
        },
        "DELETE": {
            "SUCCESS": "Attribute deleted successfully",
            "ERROR": "Unable to delete attribute. Please try again later"
        },
        "ATTRIBUTE_SELECT": {
            "TITLE": "Add attributes",
            "PLACEHOLDER": "Search attributes",
            "NO_RESULT": "No attributes found"
        }
    },
    "CONVERSATION_PARTICIPANTS": {
        "SIDEBAR_MENU_TITLE": "Participating",
        "SIDEBAR_TITLE": "Conversation participants",
        "NO_RECORDS_FOUND": "No results found",
        "ADD_PARTICIPANTS": "Select participants",
        "REMANING_PARTICIPANTS_TEXT": "+{count} others",
        "REMANING_PARTICIPANT_TEXT": "+{count} other",
        "TOTAL_PARTICIPANTS_TEXT": "{count} people are participating.",
        "TOTAL_PARTICIPANT_TEXT": "{count} person is participating.",
        "NO_PARTICIPANTS_TEXT": "No one is participating!.",
        "WATCH_CONVERSATION": "Join conversation",
        "YOU_ARE_WATCHING": "You are participating",
        "API": {
            "ERROR_MESSAGE": "Could not update, try again!",
            "SUCCESS_MESSAGE": "Participants updated!"
        }
    },
    "CONVERSATION_SIDEBAR": {
        "ASSIGNEE_LABEL": "Assigned Agent",
        "SELF_ASSIGN": "Assign to me",
        "TEAM_LABEL": "Assigned Team",
        "SELECT": {
            "PLACEHOLDER": "None"
        },
        "ACCORDION": {
            "CONTACT_DETAILS": "Details",
            "CONVERSATION_ACTIONS": "Conversation Actions",
            "CONVERSATION_LABELS": "Conversation Labels",
            "CONVERSATION_INFO": "Conversation Information",
            "CONTACT_NOTES": "Notes",
            "CONTACT_ATTRIBUTES": "Attributes",
            "PREVIOUS_CONVERSATION": "Previous Conversations",
            "MACROS": "Macros",
            "LINEAR_ISSUES": "Linked Linear Issues",
            "SHOPIFY_ORDERS": "Shopify Orders",
            "SHARED_FILES": "Media, files and links"
        },
        "SHARED_FILES": {
            "EMPTY": "No attachments yet",
            "DOWNLOAD": "Download file",
            "DOWNLOAD_ERROR": "Could not download the file. Please try again.",
            "MEDIA_HEADING": "Media",
            "FILES_HEADING": "Files",
            "VIEW_ALL": "View all",
            "SHOW_LESS": "Show less",
            "MORE_COUNT": "+{count}",
            "UNTITLED_FILE": "Untitled file",
            "JUMP_TO_MESSAGE": "Jump to message",
            "TAB_MEDIA": "Media",
            "TAB_FILES": "Files",
            "TAB_LINKS": "Links",
            "EMPTY_TAB": "Nothing here in this conversation yet",
            "LOAD_MORE": "Load more",
            "LOAD_ERROR": "Could not load. Please try again.",
            "OPEN_LINK": "Open link",
            "OPEN_SCREEN": "View media, files and links",
            "BACK": "Back"
        },
        "SHOPIFY": {
            "ORDER_ID": "Order #{id}",
            "ERROR": "Error loading orders",
            "NO_SHOPIFY_ORDERS": "No orders found",
            "FINANCIAL_STATUS": {
                "PENDING": "Pending",
                "AUTHORIZED": "Authorized",
                "PARTIALLY_PAID": "Partially Paid",
                "PAID": "Paid",
                "PARTIALLY_REFUNDED": "Partially Refunded",
                "REFUNDED": "Refunded",
                "VOIDED": "Voided"
            },
            "FULFILLMENT_STATUS": {
                "FULFILLED": "Fulfilled",
                "PARTIALLY_FULFILLED": "Partially Fulfilled",
                "UNFULFILLED": "Unfulfilled"
            }
        }
    },
    "CONVERSATION_WORKFLOW": {
        "INDEX": {
            "HEADER": {
                "TITLE": "Conversation Workflows",
                "DESCRIPTION": "Configure rules and required fields for conversation resolution."
            }
        },
        "REQUIRED_ATTRIBUTES": {
            "TITLE": "Attributes required on resolution",
            "DESCRIPTION": "When resolving a conversation, agents will be prompted to fill these attributes if they haven't yet.",
            "NO_ATTRIBUTES": "No attributes added yet",
            "ADD": {
                "TITLE": "Add Attributes",
                "SEARCH_PLACEHOLDER": "Search attributes"
            },
            "SAVE": {
                "SUCCESS": "Required attributes updated",
                "ERROR": "Could not update required attributes, please try again"
            },
            "MODAL": {
                "TITLE": "Resolve conversation",
                "DESCRIPTION": "Please fill in the following custom attributes before resolving this conversation",
                "ACTIONS": {
                    "RESOLVE": "Resolve conversation",
                    "CANCEL": "Cancel"
                },
                "PLACEHOLDERS": {
                    "TEXT": "Write a note...",
                    "NUMBER": "Enter a number",
                    "LINK": "Add a link",
                    "DATE": "Pick a date",
                    "LIST": "Select an option"
                },
                "CHECKBOX": {
                    "YES": "Yes",
                    "NO": "No"
                }
            },
            "PAYWALL": {
                "TITLE": "Upgrade to use required attributes",
                "AVAILABLE_ON": "The required conversation attributes feature is available on the Business and Enterprise plans.",
                "UPGRADE_PROMPT": "Upgrade your plan to prompt agents to fill required attributes before conversation resolution.",
                "UPGRADE_NOW": "Upgrade now",
                "CANCEL_ANYTIME": "You can change or cancel your plan anytime"
            },
            "ENTERPRISE_PAYWALL": {
                "AVAILABLE_ON": "The required conversation attributes feature is available on the paid plans.",
                "UPGRADE_PROMPT": "Upgrade to a paid plan to enforce required attributes before conversation resolution.",
                "ASK_ADMIN": "Please reach out to your administrator for the upgrade."
            }
        }
    },
    "CONVERSATIONS": {
        "activity": {
            "status": {
                "resolved": "Conversation was marked resolved by {user_name}",
                "contact_resolved": "Conversation was resolved by {contact_name}",
                "open": "Conversation was reopened by {user_name}",
                "pending": "Conversation was marked as pending by {user_name}",
                "snoozed": "Conversation was snoozed by {user_name}",
                "auto_resolved_days": "Conversation was marked resolved by system due to {count} days of inactivity",
                "auto_resolved_hours": "Conversation was marked resolved by system due to {count} hours of inactivity",
                "auto_resolved_minutes": "Conversation was marked resolved by system due to {count} minutes of inactivity",
                "system_auto_open": "System reopened the conversation due to a new incoming message."
            },
            "priority": {
                "added": "{user_name} set the priority to {new_priority}",
                "updated": "{user_name} changed the priority from {old_priority} to {new_priority}",
                "removed": "{user_name} removed the priority"
            },
            "assignee": {
                "self_assigned": "{user_name} self-assigned this conversation",
                "assigned": "Assigned to {assignee_name} by {user_name}",
                "removed": "Conversation unassigned by {user_name}"
            },
            "team": {
                "assigned": "Assigned to {team_name} by {user_name}",
                "assigned_with_assignee": "Assigned to {assignee_name} via {team_name} by {user_name}",
                "removed": "Unassigned from {team_name} by {user_name}"
            },
            "labels": {
                "added": "{user_name} added {labels}",
                "removed": "{user_name} removed {labels}"
            },
            "csat": {
                "not_sent_due_to_messaging_window": "CSAT survey not sent due to outgoing message restrictions"
            },
            "auto_resolve": {
                "not_sent_due_to_messaging_window": "Auto-resolve message not sent due to outgoing message restrictions"
            },
            "agent_bot": {
                "error_moved_to_open": "Conversation was marked open by system due to an error with the agent bot."
            },
            "muted": "{user_name} has muted the conversation",
            "unmuted": "{user_name} has unmuted the conversation"
        },
        "reply": {
            "email": {
                "header": {
                    "notifications": "Notifications",
                    "from_with_name": "{assignee_name} from {inbox_name} <{from_email}>",
                    "reply_with_name": "{assignee_name} from {inbox_name} <reply+{reply_email}>",
                    "friendly_name": "{sender_name} from {business_name} <{from_email}>",
                    "sender_only_name": "{sender_name} <{from_email}>",
                    "professional_name": "{business_name} <{from_email}>"
                }
            },
            "email_subject": "New messages on this conversation",
            "transcript_subject": "Conversation Transcript"
        },
        "templates": {
            "ways_to_reach_you_message_body": "Give the team a way to reach you.",
            "email_input_box_message_body": "Get notified by email",
            "csat_input_message_body": "How was the support you received?"
        },
        "messages": {
            "deleted": "This message was deleted",
            "business_card": "[Contact card]",
            "bank_card": "[Bank account]",
            "reminder": "[Reminder]",
            "call": "[Call]",
            "link": "[Link]",
            "friend_request": "[Friend request]"
        }
    },
    "COPILOT": {
        "TRY_THESE_PROMPTS": "Try these prompts"
    },
    "CREATE_ACCOUNT": {
        "NO_ACCOUNT_WARNING": "Uh oh! We could not find any {installationName} accounts. Please create a new account to continue.",
        "NEW_ACCOUNT": "New Account",
        "SELECTOR_SUBTITLE": "Create a new account",
        "API": {
            "SUCCESS_MESSAGE": "Account created successfully",
            "EXIST_MESSAGE": "Account already exists",
            "ERROR_MESSAGE": "Could not connect to the server. Please try again later."
        },
        "FORM": {
            "NAME": {
                "LABEL": "Company Name",
                "PLACEHOLDER": "Wayne Enterprises"
            },
            "SUBMIT": "Submit",
            "CANCEL": "Cancel"
        }
    },
    "CSAT": {
        "TITLE": "Rate your conversation",
        "PLACEHOLDER": "Tell us more...",
        "RATINGS": {
            "POOR": "😞 Poor",
            "FAIR": "😑 Fair",
            "AVERAGE": "😐 Average",
            "GOOD": "😀 Good",
            "EXCELLENT": "😍 Excellent"
        }
    },
    "CSAT_REPORTS": {
        "HEADER": "CSAT Reports",
        "NO_RECORDS": "No responses yet",
        "NO_RECORDS_DESCRIPTION": "CSAT survey responses will appear here once customers start providing feedback.",
        "DOWNLOAD": "Download CSAT Reports",
        "DOWNLOAD_FAILED": "Failed to download CSAT Reports",
        "FILTERS": {
            "ADD_FILTER": "Add filter",
            "CLEAR_ALL": "Clear all",
            "NO_FILTER": "No filters available",
            "INPUT_PLACEHOLDER": {
                "AGENTS": "Search agents",
                "INBOXES": "Search inboxes",
                "TEAMS": "Search teams",
                "RATINGS": "Search ratings"
            },
            "AGENTS": {
                "LABEL": "Agent"
            },
            "INBOXES": {
                "LABEL": "Inbox"
            },
            "TEAMS": {
                "LABEL": "Team"
            },
            "RATINGS": {
                "LABEL": "Rating"
            }
        },
        "TABLE": {
            "HEADER": {
                "CONTACT_NAME": "Contact",
                "AGENT_NAME": "Agent",
                "RATING": "Rating",
                "FEEDBACK_TEXT": "Feedback comment",
                "CONVERSATION": "Conversation",
                "CUSTOMER": "Customer",
                "RESPONSE": "Response",
                "HANDLED_BY": "Handled by"
            },
            "UNKNOWN_CUSTOMER": "Unknown customer"
        },
        "NO_AGENT": "No assigned agent",
        "NO_FEEDBACK": "No feedback provided",
        "METRIC": {
            "TOTAL_RESPONSES": {
                "LABEL": "Total responses",
                "TOOLTIP": "Total number of responses collected"
            },
            "SATISFACTION_SCORE": {
                "LABEL": "Satisfaction score",
                "TOOLTIP": "Total number of positive responses / Total number of responses * 100"
            },
            "RESPONSE_RATE": {
                "LABEL": "Response rate",
                "TOOLTIP": "Total number of responses / Total number of CSAT survey messages sent * 100"
            },
            "RATING_DISTRIBUTION": "Rating distribution"
        }
    },
    "CUSTOM_ATTRIBUTES": {
        "BUTTON": "Add custom attribute",
        "COPY_SUCCESSFUL": "Copied to clipboard successfully",
        "SHOW_MORE": "Show all attributes",
        "SHOW_LESS": "Show less attributes",
        "ACTIONS": {
            "COPY": "Copy attribute",
            "DELETE": "Delete attribute",
            "EDIT": "Edit attribute"
        },
        "ADD": {
            "TITLE": "Create custom attribute",
            "DESC": "Add custom information to this contact."
        },
        "FORM": {
            "CREATE": "Add attribute",
            "CANCEL": "Cancel",
            "NAME": {
                "LABEL": "Custom attribute name",
                "PLACEHOLDER": "Eg: shopify id",
                "ERROR": "Invalid custom attribute name"
            },
            "VALUE": {
                "LABEL": "Attribute value",
                "PLACEHOLDER": "Eg: 11901 "
            },
            "ADD": {
                "TITLE": "Create new attribute ",
                "SUCCESS": "Attribute added successfully",
                "ERROR": "Unable to add attribute. Please try again later"
            },
            "UPDATE": {
                "SUCCESS": "Attribute updated successfully",
                "ERROR": "Unable to update attribute. Please try again later"
            },
            "DELETE": {
                "SUCCESS": "Attribute deleted successfully",
                "ERROR": "Unable to delete attribute. Please try again later"
            },
            "ATTRIBUTE_SELECT": {
                "TITLE": "Add attributes",
                "PLACEHOLDER": "Search attributes",
                "NO_RESULT": "No attributes found"
            },
            "ATTRIBUTE_TYPE": {
                "LIST": {
                    "PLACEHOLDER": "Select value",
                    "SEARCH_INPUT_PLACEHOLDER": "Search value",
                    "NO_RESULT": "No result found"
                }
            }
        },
        "VALIDATIONS": {
            "REQUIRED": "Valid value is required",
            "INVALID_URL": "Invalid URL",
            "INVALID_INPUT": "Invalid Input"
        }
    },
    "DASHBOARD_APPS": {
        "LOADING_MESSAGE": "Loading Dashboard App..."
    },
    "DATA_IMPORTS": {
        "HEADER": "Data",
        "DESCRIPTION": "Bring your existing contacts and past conversations into this account from another support tool. Each import runs in the background, so you can keep working while it finishes, track its progress, and review anything that was skipped along the way.",
        "LOADING": "Fetching imports",
        "DEFAULT_IMPORT_NAME": "Intercom import",
        "DEFAULT_IMPORT_NAMES": {
            "INTERCOM": "Intercom import",
            "FRESHDESK": "Freshdesk import"
        },
        "TABS": {
            "IMPORT": "Import",
            "EXPORT": "Export"
        },
        "TYPES": {
            "CONTACTS": "Contacts",
            "CONVERSATIONS": "Conversations",
            "MESSAGES": "Messages"
        },
        "DRAWER": {
            "TITLE": "New import",
            "SOURCE": "Source",
            "NAME": "Import name",
            "NAME_PLACEHOLDER": "July support migration",
            "ACCESS_KEY": "Intercom access key",
            "ACCESS_KEY_PLACEHOLDER": "Paste your Intercom access key",
            "INTERCOM_ACCESS_KEY": "Intercom access key",
            "INTERCOM_ACCESS_KEY_PLACEHOLDER": "Paste your Intercom access key",
            "FRESHDESK_API_KEY": "Freshdesk API key",
            "FRESHDESK_API_KEY_PLACEHOLDER": "Paste your Freshdesk API key",
            "FRESHDESK_DOMAIN": "Freshdesk domain",
            "FRESHDESK_DOMAIN_PLACEHOLDER": "acme.freshdesk.com",
            "DATA_TYPES": "Data to import",
            "VALIDATING": "Validating access key...",
            "VALID_KEY": "Access key validated.",
            "INVALID_KEY": "Could not validate this access key.",
            "ACTIVE_IMPORT": "Wait for the active import to finish before starting another one.",
            "CANCEL": "Cancel",
            "IMPORT": "Import"
        },
        "EXPORT": {
            "TITLE": "Exports are on the way",
            "DESCRIPTION": "Export your contacts and conversations out of this account. This workflow is coming soon.",
            "COMING_SOON": "Coming soon"
        },
        "TABLE": {
            "TITLE": "Recent imports",
            "EMPTY": "No imports yet",
            "EMPTY_DESCRIPTION": "Start an import to bring your existing customer history into this account.",
            "NEW_IMPORT": "Import",
            "COUNT": "{count} imports",
            "UNNAMED": "Untitled import",
            "IMPORTED_COUNT": "{count} imported",
            "VIEW": "View import",
            "NAME": "Name",
            "TYPE": "Type",
            "STATUS": "Status",
            "IMPORTED": "Imported",
            "CREATED": "Created",
            "RETRY": "Retry",
            "ABANDON": "Abandon"
        },
        "DETAIL": {
            "BACK": "Back to imports",
            "ERRORS": "Errors",
            "SKIP_LOGS": "Skip logs",
            "SOURCE": "Source",
            "IMPORT_TYPES": "Import types",
            "CREATED": "Created",
            "DURATION": "Duration",
            "INITIATED_BY": "Started by",
            "PROGRESS": "Import progress",
            "PROGRESS_WITH_TOTAL": "{imported} of {total} imported",
            "PROGRESS_WITHOUT_TOTAL": "{imported} imported",
            "PROGRESS_OF_TOTAL": "of {total} imported",
            "PROGRESS_IMPORTED": "imported",
            "LAST_UPDATED_TOOLTIP": "Last updated {time}",
            "NO_SKIP_LOGS": "No skipped or failed records recorded.",
            "DOWNLOAD_SKIP_LOGS": "Download CSV",
            "DOWNLOAD_ERROR_LOGS": "Download CSV",
            "ALL_SKIP_LOGS": "All",
            "KIND": "Kind",
            "NO_ERRORS": "No errors recorded.",
            "ERROR_CODE": "Code",
            "SOURCE_OBJECT": "Source object",
            "MESSAGE": "Message"
        },
        "MONITOR": {
            "LIVE": "Live updates every {seconds}s",
            "LAST_UPDATED": "Last updated {time}",
            "REFRESH": "Refresh",
            "REFRESHING": "Refreshing",
            "STAGES": {
                "unknown": "Waiting for update",
                "queued": "Queued",
                "contacts": "Importing contacts",
                "conversations": "Importing conversations",
                "finalizing": "Finalizing import",
                "completed": "Completed",
                "completed_with_errors": "Completed with errors",
                "failed": "Failed",
                "abandoned": "Abandoned"
            }
        },
        "ALERTS": {
            "IMPORT_STARTED": "Import has started.",
            "IMPORT_RETRIED": "Import has been queued to resume.",
            "IMPORT_RETRY_FAILED": "Could not retry the import.",
            "IMPORT_ABANDONED": "Import has been abandoned.",
            "IMPORT_FAILED": "Could not start the import."
        }
    },
    "DATE_PICKER": {
        "PREVIOUS_PERIOD": "Previous period",
        "NEXT_PERIOD": "Next period",
        "WEEK_NUMBER": "Week #{weekNumber}",
        "APPLY_BUTTON": "Apply",
        "CLEAR_BUTTON": "Clear",
        "DATE_RANGE_INPUT": {
            "START": "Start Date",
            "END": "End Date"
        },
        "DATE_RANGE_OPTIONS": {
            "TITLE": "DATE RANGE",
            "LAST_7_DAYS": "Last 7 days",
            "LAST_30_DAYS": "Last 30 days",
            "LAST_3_MONTHS": "Last 3 months",
            "LAST_6_MONTHS": "Last 6 months",
            "LAST_YEAR": "Last year",
            "THIS_WEEK": "This week",
            "MONTH_TO_DATE": "This month",
            "CUSTOM_RANGE": "Custom date range"
        }
    },
    "DAYS_OF_WEEK": {
        "SUNDAY": "Sunday",
        "MONDAY": "Monday",
        "TUESDAY": "Tuesday",
        "WEDNESDAY": "Wednesday",
        "THURSDAY": "Thursday",
        "FRIDAY": "Friday",
        "SATURDAY": "Saturday"
    },
    "DELETE_CONTACT": {
        "BUTTON_LABEL": "Remove from list",
        "TITLE": "Remove from list",
        "DESC": "Remove this person from your list",
        "CONFIRM": {
            "TITLE": "Confirm Deletion",
            "MESSAGE": "Are you sure to delete ",
            "YES": "Yes, Delete",
            "NO": "No, Keep"
        },
        "API": {
            "SUCCESS_MESSAGE": "Removed from your list",
            "ERROR_MESSAGE": "Could not remove. Please try again later."
        }
    },
    "DIALOG": {
        "BUTTONS": {
            "CANCEL": "Cancel",
            "CONFIRM": "Confirm"
        }
    },
    "DROPDOWN_MENU": {
        "SEARCH_PLACEHOLDER": "Search...",
        "EMPTY_STATE": "No results found.",
        "SEARCHING": "Searching..."
    },
    "DURATION_INPUT": {
        "MINUTES": "Minutes",
        "HOURS": "Hours",
        "DAYS": "Days",
        "PLACEHOLDER": "Enter duration"
    },
    "EDIT_CONTACT": {
        "BUTTON_LABEL": "Edit",
        "TITLE": "Edit profile",
        "DESC": "Personal info"
    },
    "EMAIL_HEADER": {
        "FROM": "From",
        "TO": "To",
        "BCC": "Bcc",
        "CC": "Cc",
        "SUBJECT": "Subject",
        "DATE": "Date",
        "EXPAND": "Show full email",
        "COLLAPSE": "Collapse email",
        "BODY_FRAME_TITLE": "Email content"
    },
    "EMAIL_TRANSCRIPT": {
        "TITLE": "Send conversation transcript",
        "DESC": "Send a copy of the conversation transcript to the specified email address",
        "SUBMIT": "Submit",
        "CANCEL": "Cancel",
        "SEND_EMAIL_SUCCESS": "The chat transcript was sent successfully",
        "SEND_EMAIL_ERROR": "There was an error, please try again",
        "SEND_EMAIL_PAYMENT_REQUIRED": "Email transcript is not available on your current plan. Please upgrade to use this feature.",
        "FORM": {
            "SEND_TO_CONTACT": "Send the transcript to the customer",
            "SEND_TO_AGENT": "Send the transcript to the assigned agent",
            "SEND_TO_OTHER_EMAIL_ADDRESS": "Send the transcript to another email address",
            "EMAIL": {
                "PLACEHOLDER": "Enter an email address",
                "ERROR": "Please enter a valid email address"
            }
        }
    },
    "EMOJI_ICON_PICKER": {
        "TABS": {
            "ICONS": "Icons",
            "EMOJIS": "Emojis"
        },
        "SEARCH_EMOJI": "Search emoji…",
        "SEARCH_ICON": "Search icons…",
        "FREQUENTLY_USED": "Frequently used",
        "NO_EMOJI": "No emoji match your search",
        "NO_ICON": "No icons match your search",
        "REMOVE": "Remove",
        "STYLE": {
            "OUTLINE": "Outline icons",
            "FILLED": "Filled icons"
        },
        "COLORS": {
            "SLATE": "Slate",
            "RED": "Red",
            "ORANGE": "Orange",
            "AMBER": "Amber",
            "GREEN": "Green",
            "TEAL": "Teal",
            "BLUE": "Blue",
            "INDIGO": "Indigo",
            "VIOLET": "Violet",
            "PINK": "Pink"
        }
    },
    "ERROR_PAGES": {
        "not_found": {
            "meta": {
                "title": "Page not found · Yona",
                "description": "This link does not lead to any Yona page."
            },
            "eyebrow": "Error 404",
            "title": "We could not find this page",
            "lead": "The link may have changed, the page may have been removed, or the address is missing a character. Check the link, or carry on from one of the two places below.",
            "home": "Back to home"
        }
    },
    "ERRORS": {
        "webhook": {
            "invalid": "Invalid events"
        },
        "openai": {
            "invalid_api_key": "OpenAI API key is invalid or revoked. Please check your key in your OpenAI dashboard."
        },
        "dyte": {
            "invalid_message_type": "Invalid message type. Action not permitted",
            "realtimekit_credentials_required": "Cloudflare RealtimeKit credentials are required. Delete the existing Dyte integration and create it again with Cloudflare RealtimeKit credentials."
        },
        "slack": {
            "invalid_channel_id": "Invalid slack channel. Please try again"
        },
        "reports": {
            "date_range_too_long": "Date range cannot exceed 6 months"
        },
        "inboxes": {
            "connection_not_open": "This connection method is not open yet, please choose another one"
        },
        "conversations": {
            "resolved": "Conversation is resolved and does not accept new messages",
            "contact_unreachable": "This contact has no address this inbox can send to",
            "email_undeliverable": "Cannot send email to :email: :reason"
        },
        "email_addresses": {
            "invalid_syntax": "the email address is malformed",
            "domain_not_found": "the domain does not exist",
            "domain_no_mail": "this domain does not accept email"
        },
        "messages": {
            "email_bounced": "The address :email cannot receive email: :reason",
            "email_bounced_without_reason": "The address :email cannot receive email, the receiving server returned the message",
            "email_send_failed": "The mail server refused to send: :reason",
            "email_send_failed_unknown": "Could not send the email through this inbox mail server"
        },
        "custom_filters": {
            "number_of_records": "Limit reached. The maximum number of allowed custom filters for a user per account is 1000.",
            "invalid_attribute": "Invalid attribute key - [:key]. The key should be one of [:allowed_keys] or a custom attribute defined in the account.",
            "invalid_operator": "Invalid operator. The allowed operators for :attribute_name are [:allowed_keys].",
            "invalid_query_operator": "Query operator must be either \"AND\" or \"OR\".",
            "invalid_value": "Invalid value. The values provided for :attribute_name are invalid"
        },
        "mfa": {
            "already_enabled": "MFA is already enabled",
            "not_enabled": "MFA is not enabled",
            "invalid_code": "Invalid verification code",
            "invalid_backup_code": "Invalid backup code",
            "invalid_token": "Invalid or expired MFA token",
            "invalid_credentials": "Invalid credentials or verification code"
        },
        "sessions": {
            "cannot_revoke_current": "You cannot revoke the current session."
        },
        "contacts": {
            "phone_number_invalid": "Phone number is invalid. Enter a local number like 0912 345 678, or an international number with its country code like +1 202 555 0123.",
            "email_taken": "Email has already been taken",
            "phone_number_taken": "Phone number has already been taken",
            "identifier_taken": "Identifier has already been taken",
            "import": {
                "failed": "File is blank"
            },
            "export": {
                "success": "We will notify you once contacts export file is ready to view."
            }
        },
        "meta": {
            "action": {
                "missing_source_id": "This message has no Meta id yet, so a reaction cannot be sent.",
                "outside_messaging_window": "The customer has not messaged in the last 24 hours, so Messenger does not allow reactions. Reply to them; once they message again you can react."
            }
        },
        "zalo": {
            "send": {
                "circuit_open": "The Zalo connection keeps failing, sending is paused for a moment.",
                "session_lost": "The Zalo session has ended, please scan the QR code again.",
                "bridge_unreachable": "Could not reach the Zalo service, please try again in a moment.",
                "secret_mismatch": "The Zalo service is misconfigured (send secret), please contact the administrator.",
                "zalo_rejected": "Zalo refused this message (:detail).",
                "media_fetch_failed": "The attachment could not be read to send (:detail).",
                "unknown": "This message could not be sent to Zalo (:detail).",
                "attachment_failed": "Could not send the file \":filename\": :reason"
            },
            "action": {
                "session_lost": "The Zalo session has ended, please scan the QR code again.",
                "bridge_unreachable": "Could not reach the Zalo service, please try again in a moment.",
                "secret_mismatch": "The Zalo service is misconfigured (send secret), please contact the administrator.",
                "zalo_rejected": "Zalo refused this action (:detail).",
                "bad_request": "Zalo could not identify this message any more (:detail).",
                "missing_source_id": "This message has not reached Zalo yet, so it cannot be changed there.",
                "emoji_not_supported": "Zalo does not have this reaction.",
                "unknown": "This action did not go through to Zalo (:detail)."
            }
        },
        "stickers": {
            "capability_not_supported": "This channel cannot send stickers.",
            "not_found": "This sticker could not be found, please pick another one.",
            "bad_request": "That sticker search could not be understood, please try another keyword.",
            "private_note": "Stickers cannot be added to a private note.",
            "outgoing_only": "Stickers can only be sent as a reply.",
            "with_attachments": "A sticker is sent on its own, without attachments.",
            "missing_sticker_id": "Pick a sticker to send."
        },
        "sticker_uploads": {
            "unsupported_file_type": "Only PNG, JPG, WebP or GIF images are accepted.",
            "file_too_large": "Uploaded images can be at most :max_upload_mb MB.",
            "file_unreadable": "The uploaded file could not be read, please try again.",
            "invalid_edit": "The sticker image settings are invalid. Adjust them and upload again.",
            "image_unreadable": "This image could not be read. Save it as PNG or JPG and upload again.",
            "image_too_large": "This image is too large for a sticker (too many pixels or too long an animation). Shrink or shorten it and upload again.",
            "too_many_frames": "This animation has too many frames. Trim it and upload again.",
            "image_empty": "Nothing is left after removing the background. Lower the removal sensitivity or turn background removal off.",
            "original_missing": "The original image of this sticker is gone, please upload it again.",
            "sticker_busy": "This sticker is still being rendered, please wait a few seconds and edit it again.",
            "duplicate_in_pack": "This pack already has an identical sticker with these edits.",
            "render_failed": "A sticker could not be made from this image.",
            "render_timeout": "This image took too long to process. Try a smaller image or one with fewer frames.",
            "renderer_unavailable": "Stickers cannot be made right now, please try again later.",
            "storage_write_failed": "The sticker files could not be saved, please try again later."
        },
        "sticker_library": {
            "pack_full": "A pack holds at most :max stickers. Remove some or create a new pack.",
            "too_many_packs": "An account can have at most :max sticker packs.",
            "upload_throttled": "Too many sticker uploads at once. Please wait a moment and try again.",
            "forbidden": "Your account is not allowed to use this sticker library.",
            "label_too_long": "Labels can be at most :max characters.",
            "too_many_keywords": "Use at most :max keywords.",
            "keyword_not_text": "Keywords must be text.",
            "keyword_too_long": "The keyword “:input” is longer than :max characters.",
            "pack_name_required": "Give the sticker pack a name.",
            "pack_name_too_long": "Pack names can be at most :max characters.",
            "invalid_destination": "The destination must be the account library or the platform library."
        },
        "widget_recall": {
            "capability_not_supported": "This channel does not support unsending messages.",
            "not_own_message": "You can only unsend your own messages.",
            "already_recalled": "This message was already unsent.",
            "recall_window_expired": "The time limit for unsending this message has passed."
        },
        "forward": {
            "not_forwardable": "This type of message cannot be forwarded yet.",
            "attachment_unavailable": "The file :filename is no longer on the server, so it cannot be forwarded.",
            "capability_not_supported": "The :inbox inbox cannot send :items.",
            "sticker_unavailable": "The :inbox inbox cannot send this sticker.",
            "document_unavailable": "Could not build the PDF of this email, please try again later.",
            "reply_window_closed": "The reply window for this conversation has closed.",
            "target_not_found": "Conversation not found or you do not have access to it.",
            "no_targets": "Choose at least one conversation.",
            "too_many_targets": "You can forward to at most :max conversations at a time.",
            "capabilities": {
                "outbound_text": "text messages",
                "outbound_image": "images",
                "outbound_video": "videos",
                "outbound_audio": "audio",
                "outbound_file": "files",
                "outbound_sticker": "stickers"
            }
        },
        "custom_attribute_definition": {
            "attribute_key_format": "must only contain letters, numbers, underscores, hyphens, and dots",
            "key_conflict": "The provided key is not allowed as it might conflict with default attributes."
        }
    },
    "FEATURE_SPOTLIGHT": {
        "LEARN_MORE": "Learn more",
        "WATCH_VIDEO": "Watch video"
    },
    "FILTER": {
        "TITLE": "Filter conversations",
        "SUBTITLE": "Add your filters below and hit 'Apply filters' to cut through the chat clutter.",
        "EDIT_CUSTOM_FILTER": "Edit Folder",
        "CUSTOM_VIEWS_SUBTITLE": "Add or remove filters and update your folder.",
        "ADD_NEW_FILTER": "Add filter",
        "FILTER_DELETE_ERROR": "Oops, looks like we can't save nothing! Please add at least one filter to save it.",
        "SUBMIT_BUTTON_LABEL": "Apply filters",
        "UPDATE_BUTTON_LABEL": "Update folder",
        "CANCEL_BUTTON_LABEL": "Cancel",
        "CLEAR_BUTTON_LABEL": "Clear filters",
        "FOLDER_LABEL": "Folder Name",
        "FOLDER_QUERY_LABEL": "Folder Query",
        "EMPTY_VALUE_ERROR": "Value is required.",
        "TOOLTIP_LABEL": "Filter conversations",
        "QUERY_DROPDOWN_LABELS": {
            "AND": "AND",
            "OR": "OR"
        },
        "INPUT_PLACEHOLDER": "Enter value",
        "COMPOSER": {
            "TITLE": "Advanced filter",
            "EMPTY": "No conditions yet. Pick an item below to add one.",
            "SEARCH_ATTRIBUTE": "Filter by…",
            "SEARCH_OPTION": "Search…",
            "TYPE_TO_SEARCH": "Type to search",
            "NO_MATCH": "No results",
            "BACK": "Back",
            "OPERATOR": "Comparison",
            "ADD": "Add condition",
            "SAVE": "Save",
            "REMOVE": "Remove condition",
            "MATCH": "How conditions combine",
            "MATCH_ALL": "Match all",
            "MATCH_ANY": "Match any",
            "CLEAR": "Clear all",
            "APPLY": "Apply",
            "APPLY_COUNT": "Apply ({count})"
        },
        "MULTI_VALUE_INPUT_PLACEHOLDER": "Type a value, then press Enter to add more",
        "MULTI_VALUE_INPUT_PLACEHOLDER_SHORT": "Type a value",
        "CONTACT_SEARCH_PLACEHOLDER": "Search contacts",
        "CONTACT_FALLBACK": "Contact #{id}",
        "OPERATOR_LABELS": {
            "equal_to": "Equal to",
            "not_equal_to": "Not equal to",
            "does_not_contain": "Does not contain",
            "is_present": "Is present",
            "is_not_present": "Is not present",
            "is_greater_than": "Is greater than",
            "is_less_than": "Is lesser than",
            "days_before": "Is x days before",
            "starts_with": "Starts with",
            "equalTo": "Equal to",
            "notEqualTo": "Not equal to",
            "contains": "Contains",
            "doesNotContain": "Does not contain",
            "isPresent": "Is present",
            "isNotPresent": "Is not present",
            "isGreaterThan": "Is greater than",
            "isLessThan": "Is lesser than",
            "daysBefore": "Is x days before",
            "startsWith": "Starts with"
        },
        "PREVIEW_OPERATOR_LABELS": {
            "equal_to": "is",
            "not_equal_to": "is not",
            "contains": "contains",
            "does_not_contain": "does not contain",
            "is_present": "is present",
            "is_not_present": "is not present",
            "is_greater_than": "is greater than",
            "is_less_than": "is less than",
            "days_before": "days before",
            "starts_with": "starts with"
        },
        "ATTRIBUTE_LABELS": {
            "TRUE": "True",
            "FALSE": "False"
        },
        "ATTRIBUTES": {
            "STATUS": "Status",
            "ASSIGNEE_NAME": "Assignee name",
            "INBOX_NAME": "Inbox name",
            "TEAM_NAME": "Team name",
            "CONTACT": "Contact",
            "CONVERSATION_IDENTIFIER": "Conversation identifier",
            "CAMPAIGN_NAME": "Campaign name",
            "LABELS": "Labels",
            "BROWSER_LANGUAGE": "Browser language",
            "PRIORITY": "Priority",
            "COUNTRY_NAME": "Country name",
            "REFERER_LINK": "Referer link",
            "CUSTOM_ATTRIBUTE_LIST": "List",
            "CUSTOM_ATTRIBUTE_TEXT": "Text",
            "CUSTOM_ATTRIBUTE_NUMBER": "Number",
            "CUSTOM_ATTRIBUTE_LINK": "Link",
            "CUSTOM_ATTRIBUTE_CHECKBOX": "Checkbox",
            "CREATED_AT": "Created at",
            "LAST_ACTIVITY": "Last activity"
        },
        "ERRORS": {
            "VALUE_REQUIRED": "Value is required",
            "ATTRIBUTE_KEY_REQUIRED": "Attribute key is required",
            "FILTER_OPERATOR_REQUIRED": "Filter operator is required",
            "VALUE_MUST_BE_BETWEEN_1_AND_998": "Value must be between 1 and 998"
        },
        "GROUPS": {
            "STANDARD_FILTERS": "Standard filters",
            "ADDITIONAL_FILTERS": "Additional filters",
            "CUSTOM_ATTRIBUTES": "Custom attributes"
        },
        "CUSTOM_VIEWS": {
            "ADD": {
                "TITLE": "Do you want to save this filter?",
                "LABEL": "Name this filter",
                "PLACEHOLDER": "Name your filter to refer it later.",
                "ERROR_MESSAGE": "Name is required.",
                "SAVE_BUTTON": "Save filter",
                "CANCEL_BUTTON": "Cancel",
                "API_FOLDERS": {
                    "SUCCESS_MESSAGE": "Folder created successfully.",
                    "ERROR_MESSAGE": "Error while creating folder."
                },
                "API_SEGMENTS": {
                    "SUCCESS_MESSAGE": "Segment created successfully.",
                    "ERROR_MESSAGE": "Error while creating segment."
                }
            },
            "EDIT": {
                "EDIT_BUTTON": "Edit folder"
            },
            "DELETE": {
                "DELETE_BUTTON": "Delete filter",
                "MODAL": {
                    "CONFIRM": {
                        "TITLE": "Confirm deletion",
                        "MESSAGE": "Are you sure to delete the filter ",
                        "YES": "Yes, delete",
                        "NO": "No, keep it"
                    }
                },
                "API_FOLDERS": {
                    "SUCCESS_MESSAGE": "Folder deleted successfully.",
                    "ERROR_MESSAGE": "Error while deleting folder."
                },
                "API_SEGMENTS": {
                    "SUCCESS_MESSAGE": "Segment deleted successfully.",
                    "ERROR_MESSAGE": "Error while deleting segment."
                }
            }
        }
    },
    "FRIENDS": {
        "ERRORS": {
            "SELF": "You cannot add yourself as a friend",
            "NO_USERNAME": "Both people need a @username to become friends"
        },
        "ADD": {
            "TITLE": "Add friend",
            "DESCRIPTION": "Search by @username or name, then pick someone to see their profile and add them.",
            "SENT": "Friend request sent to {name}"
        },
        "REQUESTS": {
            "INCOMING": "Received — {count}",
            "OUTGOING": "Sent — {count}",
            "INCOMING_HINT": "Wants to be your friend",
            "OUTGOING_HINT": "Waiting for a reply",
            "ACCEPT": "Accept",
            "DECLINE": "Decline",
            "CANCEL": "Cancel request",
            "ACCEPTED": "You and {name} are now friends",
            "DECLINED": "Declined the request from {name}",
            "CANCELLED": "Cancelled the request to {name}",
            "EMPTY": "No pending requests.",
            "ERROR": "Something went wrong. Please try again."
        },
        "PROFILE": {
            "CLOSE": "Close",
            "MESSAGE": "Message",
            "MORE": "More",
            "ADD_FRIEND": "Add friend",
            "REQUEST_SENT": "Request sent",
            "ACCEPT": "Accept request",
            "DECLINE": "Decline request",
            "CANCEL_REQUEST": "Cancel request",
            "UNFRIEND": "Remove friend",
            "UNFRIENDED": "You are no longer friends with {name}",
            "FRIEND": "Friend",
            "NOT_FRIEND_HINT": "Not friends yet · click to see the profile",
            "STRANGER": "Stranger",
            "ABOUT": "About",
            "JOINED": "Member since",
            "FRIENDS_SINCE": "Friends since",
            "FIRST_SEEN": "First message",
            "LABELS": "Labels",
            "NO_LABELS": "No labels yet. Add labels from the chat.",
            "CONNECTIONS": "Connections",
            "LOCKED": "Add {name} as a friend to see activity, notes and files.",
            "NO_CONNECTIONS": "No connections yet.",
            "TABS": {
                "ACTIVITY": "Activity",
                "NOTES": "Notes",
                "MEDIA": "Files"
            }
        }
    },
    "GALLERY_VIEW": {
        "ERROR_DOWNLOADING": "Unable to download attachment. Please try again",
        "VIEW_AVATAR": "View {name}'s profile photo",
        "ZOOM_IN": "Zoom in",
        "ZOOM_OUT": "Zoom out",
        "ROTATE_LEFT": "Rotate left",
        "ROTATE_RIGHT": "Rotate right",
        "DOWNLOAD": "Download",
        "CLOSE": "Close",
        "PREVIOUS": "Previous",
        "NEXT": "Next"
    },
    "GENERAL": {
        "SHOWING_RESULTS": "Showing {firstIndex}-{lastIndex} of {totalCount} items",
        "PHONE_INPUT": {
            "PLACEHOLDER": "Search",
            "EMPTY_STATE": "No results found"
        },
        "CLOSE": "Close",
        "BETA": "Beta",
        "BETA_DESCRIPTION": "This feature is in beta and may change as we improve it.",
        "ACCEPT": "Accept",
        "DISCARD": "Discard",
        "PREFERRED": "Preferred"
    },
    "GENERAL_SETTINGS": {
        "TITLE": "Account settings",
        "DESCRIPTION": "General settings for the whole business account.",
        "LANGUAGE": {
            "TITLE": "Language",
            "NOTE": "Language of the website chat widget, and of the dashboard for anyone who has not picked their own. A page embedding the widget can still pick another language with the locale option in the embed code.",
            "UPDATE_SUCCESS": "Account language updated",
            "UPDATE_ERROR": "Could not update the account language, please try again"
        },
        "BACK": "Back",
        "FORM": {
            "AUTO_RESOLVE": {
                "TITLE": "Auto-resolve conversations",
                "NOTE": "This configuration would allow you to automatically resolve the conversation after a certain period of inactivity.",
                "DURATION": {
                    "LABEL": "Inactivity duration",
                    "HELP": "Time period of inactivity after which conversation is auto-resolved",
                    "PLACEHOLDER": "30",
                    "ERROR": "Auto resolve duration should be between 10 minutes and 999 days",
                    "API": {
                        "SUCCESS": "Auto resolve settings updated successfully",
                        "ERROR": "Failed to update auto resolve settings"
                    }
                },
                "MESSAGE": {
                    "LABEL": "Custom auto-resolution message",
                    "PLACEHOLDER": "Conversation was marked resolved by system due to 15 days of inactivity",
                    "HELP": "Message sent to the customer after conversation is auto-resolved"
                },
                "PREFERENCES": "Preferences",
                "LABEL": {
                    "LABEL": "Add label after auto-resolution",
                    "PLACEHOLDER": "Select a label"
                },
                "IGNORE_WAITING": {
                    "LABEL": "Skip conversations waiting for agent’s reply"
                },
                "UPDATE_BUTTON": "Save Changes"
            }
        }
    },
    "GROUPS": {
        "ACTIVITY": {
            "CREATED": ":actor created the group \":name\"",
            "ADDED": ":actor added :members to the group",
            "JOINED_BY_LINK": ":member joined the group with an invite link",
            "LEFT": ":member left the group",
            "REMOVED": ":actor removed :member from the group",
            "RENAMED": ":actor renamed the group to \":name\"",
            "MADE_ADMIN": ":actor made :member a group admin",
            "REMOVED_ADMIN": ":actor removed :member as a group admin",
            "ADMIN_HANDOVER": ":member is now a group admin",
            "AVATAR_CHANGED": ":actor changed the group picture"
        },
        "ERRORS": {
            "NOT_A_MEMBER": "You are no longer in this group",
            "NOT_ADMIN": "Only group admins can do this",
            "NOT_FRIEND": "You can only add your friends directly. Others can join with an invite link",
            "USER_NOT_FOUND": "User not found",
            "MEMBER_NOT_FOUND": "This person is not in the group",
            "NO_USERNAME": "You need a @username to join a group",
            "FULL": "The group already has :max members",
            "LAST_ADMIN": "The group needs at least one admin",
            "INVALID_ROLE": "Invalid role",
            "INVALID_AVATAR": "Invalid group picture",
            "INVITE_UNUSABLE": "This invite link can no longer be used",
            "NAME_REQUIRED": "Give the group a name",
            "NAME_TOO_LONG": "Group names can be at most 100 characters",
            "MESSAGE_NOT_YOURS": "You can only recall your own messages"
        }
    },
    "HELP_CENTER": {
        "TITLE": "Help Center",
        "NEW_PAGE": {
            "DESCRIPTION": "Create self-service help center portals for your customers. Help them find answers quickly, without waiting. Streamline inquiries, boost agent efficiency, and elevate customer support.",
            "CREATE_PORTAL_BUTTON": "Create Portal"
        },
        "HEADER": {
            "FILTER": "Filter by",
            "SORT": "Sort by",
            "LOCALE": "Locale",
            "SETTINGS_BUTTON": "Settings",
            "NEW_BUTTON": "New Article",
            "DROPDOWN_OPTIONS": {
                "PUBLISHED": "Published",
                "DRAFT": "Draft",
                "ARCHIVED": "Archived"
            },
            "TITLES": {
                "ALL_ARTICLES": "All Articles",
                "MINE": "My Articles",
                "DRAFT": "Draft Articles",
                "ARCHIVED": "Archived Articles"
            },
            "LOCALE_SELECT": {
                "TITLE": "Select locale",
                "PLACEHOLDER": "Select locale",
                "NO_RESULT": "No locale found",
                "SEARCH_PLACEHOLDER": "Search locale"
            }
        },
        "EDIT_HEADER": {
            "ALL_ARTICLES": "All Articles",
            "PUBLISH_BUTTON": "Publish",
            "MOVE_TO_ARCHIVE_BUTTON": "Move to archived",
            "PREVIEW": "Preview",
            "ADD_TRANSLATION": "Add translation",
            "OPEN_SIDEBAR": "Open sidebar",
            "CLOSE_SIDEBAR": "Close sidebar",
            "SAVING": "Saving...",
            "SAVED": "Saved"
        },
        "ARTICLE_EDITOR": {
            "IMAGE_UPLOAD": {
                "TITLE": "Upload image",
                "UPLOADING": "Uploading...",
                "SUCCESS": "Image uploaded successfully",
                "ERROR": "Error while uploading image",
                "UN_AUTHORIZED_ERROR": "You are not authorized to upload images",
                "ERROR_FILE_SIZE": "Image size should be less than {size}MB",
                "ERROR_FILE_FORMAT": "Image format should be jpg, jpeg or png",
                "ERROR_FILE_DIMENSIONS": "Image dimensions should be less than 2000 x 2000"
            }
        },
        "ARTICLE_SETTINGS": {
            "TITLE": "Article Settings",
            "FORM": {
                "CATEGORY": {
                    "LABEL": "Category",
                    "TITLE": "Select category",
                    "PLACEHOLDER": "Select category",
                    "NO_RESULT": "No category found",
                    "SEARCH_PLACEHOLDER": "Search category"
                },
                "AUTHOR": {
                    "LABEL": "Author",
                    "TITLE": "Select author",
                    "PLACEHOLDER": "Select author",
                    "NO_RESULT": "No authors found",
                    "SEARCH_PLACEHOLDER": "Search author"
                },
                "META_TITLE": {
                    "LABEL": "Meta title",
                    "PLACEHOLDER": "Add a meta title"
                },
                "META_DESCRIPTION": {
                    "LABEL": "Meta description",
                    "PLACEHOLDER": "Add your meta description for better SEO results..."
                },
                "META_TAGS": {
                    "LABEL": "Meta tags",
                    "PLACEHOLDER": "Add meta tags separated by comma..."
                }
            },
            "BUTTONS": {
                "ARCHIVE": "Archive article",
                "DELETE": "Delete article"
            }
        },
        "ARTICLE_SEARCH_RESULT": {
            "UNCATEGORIZED": "Uncategorized",
            "SEARCH_RESULTS": "Search results for {query}",
            "EMPTY_TEXT": "Search for articles to insert into replies.",
            "SEARCH_LOADER": "Searching...",
            "INSERT_ARTICLE": "Insert",
            "NO_RESULT": "No articles found",
            "COPY_LINK": "Copy article link to clipboard",
            "OPEN_LINK": "Open article in new tab",
            "PREVIEW_LINK": "Preview article"
        },
        "PORTAL": {
            "HEADER": "Portals",
            "DEFAULT": "Default",
            "NEW_BUTTON": "New Portal",
            "ACTIVE_BADGE": "active",
            "CHOOSE_LOCALE_LABEL": "Choose a locale",
            "LOADING_MESSAGE": "Loading portals...",
            "ARTICLES_LABEL": "articles",
            "NO_PORTALS_MESSAGE": "There are no available portals",
            "ADD_NEW_LOCALE": "Add a new locale",
            "POPOVER": {
                "TITLE": "Portals",
                "PORTAL_SETTINGS": "Portal settings",
                "SUBTITLE": "You have multiple portals and can have different locales for each portal.",
                "CANCEL_BUTTON_LABEL": "Cancel",
                "CHOOSE_LOCALE_BUTTON": "Choose Locale"
            },
            "PORTAL_SETTINGS": {
                "LIST_ITEM": {
                    "HEADER": {
                        "COUNT_LABEL": "articles",
                        "ADD": "Add locale",
                        "VISIT": "Visit site",
                        "SETTINGS": "Settings",
                        "DELETE": "Delete"
                    },
                    "PORTAL_CONFIG": {
                        "TITLE": "Portal Configurations",
                        "ITEMS": {
                            "NAME": "Name",
                            "DOMAIN": "Custom domain",
                            "SLUG": "Slug",
                            "TITLE": "Portal title",
                            "THEME": "Theme color",
                            "SUB_TEXT": "Portal sub text"
                        }
                    },
                    "AVAILABLE_LOCALES": {
                        "TITLE": "Available locales",
                        "TABLE": {
                            "NAME": "Locale name",
                            "CODE": "Locale code",
                            "ARTICLE_COUNT": "No. of articles",
                            "CATEGORIES": "No. of categories",
                            "SWAP": "Swap",
                            "DELETE": "Delete",
                            "DEFAULT_LOCALE": "Default"
                        }
                    }
                },
                "DELETE_PORTAL": {
                    "TITLE": "Delete portal",
                    "MESSAGE": "Are you sure you want to delete this portal",
                    "YES": "Yes, delete portal",
                    "NO": "No, keep portal",
                    "API": {
                        "DELETE_SUCCESS": "Portal deleted successfully",
                        "DELETE_ERROR": "Error while deleting portal"
                    }
                },
                "SEND_CNAME_INSTRUCTIONS": {
                    "API": {
                        "SUCCESS_MESSAGE": "CNAME instructions sent successfully",
                        "ERROR_MESSAGE": "Error while sending CNAME instructions"
                    }
                }
            },
            "EDIT": {
                "HEADER_TEXT": "Edit portal",
                "TABS": {
                    "BASIC_SETTINGS": {
                        "TITLE": "Basic information"
                    },
                    "CUSTOMIZATION_SETTINGS": {
                        "TITLE": "Portal customization"
                    },
                    "CATEGORY_SETTINGS": {
                        "TITLE": "Categories"
                    },
                    "LOCALE_SETTINGS": {
                        "TITLE": "Locales"
                    }
                },
                "CATEGORIES": {
                    "TITLE": "Categories in",
                    "NEW_CATEGORY": "New category",
                    "TABLE": {
                        "NAME": "Name",
                        "DESCRIPTION": "Description",
                        "LOCALE": "Locale",
                        "ARTICLE_COUNT": "No. of articles",
                        "ACTION_BUTTON": {
                            "EDIT": "Edit category",
                            "DELETE": "Delete category"
                        },
                        "EMPTY_TEXT": "No categories found"
                    }
                },
                "EDIT_BASIC_INFO": {
                    "BUTTON_TEXT": "Update basic settings"
                }
            },
            "ADD": {
                "CREATE_FLOW": {
                    "BASIC": {
                        "TITLE": "Help center information",
                        "BODY": "Basic information about portal"
                    },
                    "CUSTOMIZATION": {
                        "TITLE": "Help center customization",
                        "BODY": "Customize portal"
                    },
                    "FINISH": {
                        "TITLE": "Voila! 🎉",
                        "BODY": "You're all set!"
                    }
                },
                "CREATE_FLOW_PAGE": {
                    "BACK_BUTTON": "Back",
                    "BASIC_SETTINGS_PAGE": {
                        "HEADER": "Create Portal",
                        "TITLE": "Help center information",
                        "CREATE_BASIC_SETTING_BUTTON": "Create portal basic settings"
                    },
                    "CUSTOMIZATION_PAGE": {
                        "HEADER": "Portal customisation",
                        "TITLE": "Help center customization",
                        "UPDATE_PORTAL_BUTTON": "Update portal settings"
                    },
                    "FINISH_PAGE": {
                        "TITLE": "Voila!🎉 You're all set up!",
                        "MESSAGE": "You can now see this created portal on your all portals page.",
                        "FINISH": "Go to all portals page"
                    }
                },
                "LOGO": {
                    "LABEL": "Logo",
                    "UPLOAD_BUTTON": "Upload logo",
                    "HELP_TEXT": "This logo will be displayed on the portal header.",
                    "IMAGE_UPLOAD_SUCCESS": "Logo uploaded successfully",
                    "IMAGE_UPLOAD_ERROR": "Logo deleted successfully",
                    "IMAGE_DELETE_ERROR": "Error while deleting logo"
                },
                "NAME": {
                    "LABEL": "Name",
                    "PLACEHOLDER": "Portal name",
                    "HELP_TEXT": "The name will be used in the public facing portal internally.",
                    "ERROR": "Name is required"
                },
                "SLUG": {
                    "LABEL": "Slug",
                    "PLACEHOLDER": "Portal slug for urls",
                    "ERROR": "Slug is required"
                },
                "DOMAIN": {
                    "LABEL": "Custom Domain",
                    "PLACEHOLDER": "Portal custom domain",
                    "HELP_TEXT": "Add only If you want to use a custom domain for your portals. Eg: {exampleURL}",
                    "ERROR": "Enter a valid domain URL"
                },
                "HOME_PAGE_LINK": {
                    "LABEL": "Home Page Link",
                    "PLACEHOLDER": "Portal home page link",
                    "HELP_TEXT": "The link used to return from the portal to the home page. Eg: {exampleURL}",
                    "ERROR": "Enter a valid home page URL"
                },
                "THEME_COLOR": {
                    "LABEL": "Portal theme color",
                    "HELP_TEXT": "This color will show as the theme color for the portal."
                },
                "PAGE_TITLE": {
                    "LABEL": "Page Title",
                    "PLACEHOLDER": "Portal page title",
                    "HELP_TEXT": "The page title will be used in the public facing portal.",
                    "ERROR": "Page title is required"
                },
                "HEADER_TEXT": {
                    "LABEL": "Header Text",
                    "PLACEHOLDER": "Portal header text",
                    "HELP_TEXT": "The Portal header text will be used in the public facing portal.",
                    "ERROR": "Portal header text is required"
                },
                "API": {
                    "SUCCESS_MESSAGE_FOR_BASIC": "Portal created successfully.",
                    "ERROR_MESSAGE_FOR_BASIC": "Couldn't create the portal. Try again.",
                    "SUCCESS_MESSAGE_FOR_UPDATE": "Portal updated successfully.",
                    "ERROR_MESSAGE_FOR_UPDATE": "Couldn't update the portal. Try again."
                }
            },
            "ADD_LOCALE": {
                "TITLE": "Add a new locale",
                "SUB_TITLE": "This adds a new locale to your available translation list.",
                "PORTAL": "Portal",
                "LOCALE": {
                    "LABEL": "Locale",
                    "PLACEHOLDER": "Choose a locale",
                    "ERROR": "Locale is required"
                },
                "BUTTONS": {
                    "CREATE": "Create locale",
                    "CANCEL": "Cancel"
                },
                "API": {
                    "SUCCESS_MESSAGE": "Locale added successfully",
                    "ERROR_MESSAGE": "Unable to add locale. Try again."
                }
            },
            "CHANGE_DEFAULT_LOCALE": {
                "API": {
                    "SUCCESS_MESSAGE": "Default locale updated successfully",
                    "ERROR_MESSAGE": "Unable to update default locale. Try again."
                }
            },
            "DELETE_LOCALE": {
                "API": {
                    "SUCCESS_MESSAGE": "Locale removed from portal successfully",
                    "ERROR_MESSAGE": "Unable to remove locale from portal. Try again."
                }
            },
            "DRAFT_LOCALE": {
                "API": {
                    "SUCCESS_MESSAGE": "Locale moved to draft successfully",
                    "ERROR_MESSAGE": "Unable to move locale to draft. Try again."
                }
            },
            "PUBLISH_LOCALE": {
                "API": {
                    "SUCCESS_MESSAGE": "Locale published successfully",
                    "ERROR_MESSAGE": "Unable to publish locale. Try again."
                }
            }
        },
        "TABLE": {
            "LOADING_MESSAGE": "Loading articles...",
            "404": "No articles matches your search 🔍",
            "NO_ARTICLES": "There are no available articles",
            "HEADERS": {
                "TITLE": "Title",
                "CATEGORY": "Category",
                "READ_COUNT": "Views",
                "STATUS": "Status",
                "LAST_EDITED": "Last edited"
            },
            "COLUMNS": {
                "BY": "by",
                "AUTHOR_NOT_AVAILABLE": "Author is not available"
            }
        },
        "EDIT_ARTICLE": {
            "LOADING": "Loading article...",
            "TITLE_PLACEHOLDER": "Article title goes here",
            "CONTENT_PLACEHOLDER": "Write your article here",
            "API": {
                "ERROR": "Error while saving article"
            }
        },
        "PUBLISH_ARTICLE": {
            "API": {
                "ERROR": "Error while publishing article",
                "SUCCESS": "Article published successfully"
            }
        },
        "ARCHIVE_ARTICLE": {
            "API": {
                "ERROR": "Error while archiving article",
                "SUCCESS": "Article archived successfully"
            }
        },
        "DRAFT_ARTICLE": {
            "API": {
                "ERROR": "Error while drafting article",
                "SUCCESS": "Article drafted successfully"
            }
        },
        "DELETE_ARTICLE": {
            "MODAL": {
                "CONFIRM": {
                    "TITLE": "Confirm Deletion",
                    "MESSAGE": "Are you sure to delete the article?",
                    "YES": "Yes, Delete",
                    "NO": "No, Keep it"
                }
            },
            "API": {
                "SUCCESS_MESSAGE": "Article deleted successfully",
                "ERROR_MESSAGE": "Error while deleting article"
            }
        },
        "REORDER_ARTICLE": {
            "API": {
                "ERROR_MESSAGE": "Unable to reorder articles. Please try again."
            }
        },
        "REORDER_CATEGORY": {
            "API": {
                "ERROR_MESSAGE": "Unable to reorder categories. Please try again."
            }
        },
        "CREATE_ARTICLE": {
            "ERROR_MESSAGE": "Please add the article heading and content then only you can update the settings"
        },
        "SIDEBAR": {
            "SEARCH": {
                "PLACEHOLDER": "Search for articles"
            }
        },
        "BREADCRUMB": {
            "ARTICLES": "Articles",
            "CATEGORIES": "Categories",
            "LOCALES": "Locales",
            "SETTINGS": "Settings"
        },
        "CATEGORY": {
            "ADD": {
                "TITLE": "Create a category",
                "SUB_TITLE": "The category will be used in the public facing portal to categorize articles.",
                "PORTAL": "Portal",
                "LOCALE": "Locale",
                "NAME": {
                    "LABEL": "Name",
                    "PLACEHOLDER": "Category name",
                    "HELP_TEXT": "The category name and icon will be used in the public facing portal to categorize articles.",
                    "ERROR": "Name is required"
                },
                "SLUG": {
                    "LABEL": "Slug",
                    "PLACEHOLDER": "Category slug for urls",
                    "HELP_TEXT": "yona.vn/hc/my-portal/en-US/categories/my-slug",
                    "ERROR": "Slug is required"
                },
                "DESCRIPTION": {
                    "LABEL": "Description",
                    "PLACEHOLDER": "Give a short description about the category.",
                    "ERROR": "Description is required"
                },
                "BUTTONS": {
                    "CREATE": "Create category",
                    "CANCEL": "Cancel"
                },
                "API": {
                    "SUCCESS_MESSAGE": "Category created successfully",
                    "ERROR_MESSAGE": "Unable to create category"
                }
            },
            "EDIT": {
                "TITLE": "Edit a category",
                "SUB_TITLE": "Editing a category will update the category in the public facing portal.",
                "PORTAL": "Portal",
                "LOCALE": "Locale",
                "NAME": {
                    "LABEL": "Name",
                    "PLACEHOLDER": "Category name",
                    "HELP_TEXT": "The category name and icon will be used in the public facing portal to categorize articles.",
                    "ERROR": "Name is required"
                },
                "SLUG": {
                    "LABEL": "Slug",
                    "PLACEHOLDER": "Category slug for urls",
                    "HELP_TEXT": "yona.vn/hc/my-portal/en-US/categories/my-slug",
                    "ERROR": "Slug is required"
                },
                "DESCRIPTION": {
                    "LABEL": "Description",
                    "PLACEHOLDER": "Give a short description about the category.",
                    "ERROR": "Description is required"
                },
                "BUTTONS": {
                    "CREATE": "Update category",
                    "CANCEL": "Cancel"
                },
                "API": {
                    "SUCCESS_MESSAGE": "Category updated successfully",
                    "ERROR_MESSAGE": "Unable to update category"
                }
            },
            "DELETE": {
                "API": {
                    "SUCCESS_MESSAGE": "Category deleted successfully",
                    "ERROR_MESSAGE": "Unable to delete category"
                }
            }
        },
        "ARTICLE_SEARCH": {
            "TITLE": "Search articles",
            "PLACEHOLDER": "Search articles",
            "NO_RESULT": "No articles found",
            "SEARCHING": "Searching...",
            "SEARCH_BUTTON": "Search",
            "INSERT_ARTICLE": "Insert link",
            "IFRAME_ERROR": "URL is empty or invalid. Unable to display content.",
            "OPEN_ARTICLE_SEARCH": "Insert article from Help Center",
            "SUCCESS_ARTICLE_INSERTED": "Article inserted successfully",
            "PREVIEW_LINK": "Preview article",
            "CANCEL": "Close",
            "BACK": "Back",
            "BACK_RESULTS": "Back to results"
        },
        "UPGRADE_PAGE": {
            "TITLE": "Help Center",
            "DESCRIPTION": "Create user-friendly self-service portals. Help your users to access the articles and get support 24/7. Upgrade your subscription to enable this feature.",
            "SELF_HOSTED_DESCRIPTION": "Create user-friendly self-service portals. Help your users to access the articles and get support 24/7. Please contact your administrator to enable this feature.",
            "BUTTON": {
                "LEARN_MORE": "Learn more",
                "UPGRADE": "Upgrade"
            },
            "FEATURES": {
                "PORTALS": {
                    "TITLE": "Multiple portals",
                    "DESCRIPTION": "Create multiple help center portals for different products using the same account."
                },
                "LOCALES": {
                    "TITLE": "Full support for locales",
                    "DESCRIPTION": "Localize the portal in your language. We support all locales and allow translations for every article."
                },
                "SEO": {
                    "TITLE": "SEO-friendly design",
                    "DESCRIPTION": "Customize your meta tags to improve your visibility on search engines with our SEO-friendly pages."
                },
                "API": {
                    "TITLE": "Full API support",
                    "DESCRIPTION": "Use the portal as a headless CMS with third party front-end frameworks using our APIs."
                }
            }
        },
        "LOADING": "Loading...",
        "ARTICLES_PAGE": {
            "ARTICLE_CARD": {
                "CARD": {
                    "VIEWS": "{count} view | {count} views",
                    "DROPDOWN_MENU": {
                        "PUBLISH": "Publish",
                        "DRAFT": "Draft",
                        "ARCHIVE": "Archive",
                        "TRANSLATE": "Translate",
                        "DELETE": "Delete"
                    },
                    "STATUS": {
                        "DRAFT": "Draft",
                        "PUBLISHED": "Published",
                        "ARCHIVED": "Archived"
                    },
                    "PENDING_EDITS": "Unpublished edits",
                    "PENDING_EDITS_TOOLTIP": "This published article has unpublished edits",
                    "CATEGORY": {
                        "UNCATEGORISED": "Uncategorised"
                    }
                }
            },
            "ARTICLES_HEADER": {
                "TABS": {
                    "ALL": "All articles",
                    "MINE": "Mine",
                    "DRAFT": "Draft",
                    "PUBLISHED": "Published",
                    "ARCHIVED": "Archived"
                },
                "CATEGORY": {
                    "ALL": "All categories"
                },
                "LOCALE": {
                    "ALL": "All locales"
                },
                "SEARCH_PLACEHOLDER": "Search articles...",
                "NEW_ARTICLE": "New article"
            },
            "EMPTY_STATE": {
                "ALL": {
                    "TITLE": "Write an article",
                    "SUBTITLE": "Write a rich article, let’s get started!",
                    "BUTTON_LABEL": "New article"
                },
                "MINE": {
                    "TITLE": "You haven't written any articles here",
                    "SUBTITLE": "All articles written by you show up here for quick access."
                },
                "DRAFT": {
                    "TITLE": "There are no articles in drafts",
                    "SUBTITLE": "Draft articles will appear here"
                },
                "PUBLISHED": {
                    "TITLE": "There are no published articles",
                    "SUBTITLE": "Published articles will appear here"
                },
                "ARCHIVED": {
                    "TITLE": "There are no articles in the archive",
                    "SUBTITLE": "Archived articles don't show up on the portal, you can use it to mark deprecated or outdated pages"
                },
                "CATEGORY": {
                    "TITLE": "There are no articles in this category",
                    "SUBTITLE": "Articles in this category will appear here"
                },
                "SEARCH": {
                    "TITLE": "No matching articles",
                    "SUBTITLE": "We couldn't find any articles matching your search. Try a different term."
                }
            },
            "BULK_TRANSLATE": {
                "TITLE": "Translate article | Translate {count} articles",
                "DESCRIPTION": "Translate the selected article to another language. | Translate the selected articles to another language.",
                "LOCALE_LABEL": "Target language",
                "LOCALE_PLACEHOLDER": "Select a language",
                "CATEGORY_LABEL": "Target category",
                "CATEGORY_PLACEHOLDER": "Select a category",
                "OPTIONAL": "(optional)",
                "CONFIRM": "Translate",
                "SELECT_ALL": "Select all ({count})",
                "SELECTED_COUNT": "{count} selected",
                "CLEAR_SELECTION": "Clear selection",
                "TRANSLATE_BUTTON": "Translate",
                "CONFIRM_OVERWRITE": "Overwrite and translate",
                "DUPLICATE_WARNING": "A translation already exists for this article in the selected language. | Translations already exist for {count} articles in the selected language.",
                "DUPLICATE_CONFIRM_HINT": "Click translate again to overwrite the existing translation.",
                "API": {
                    "SUCCESS_MESSAGE": "Translation in progress. The article will appear as a draft once ready.",
                    "ERROR_MESSAGE": "Failed to start translation. Please try again."
                }
            },
            "BULK_ACTIONS": {
                "PUBLISH": "Publish",
                "DRAFT": "Draft",
                "ARCHIVE": "Archive",
                "TRANSLATE": "Translate",
                "MOVE_TO_CATEGORY": "Category",
                "DELETE": "Delete",
                "STATUS_SUCCESS": "Articles updated successfully",
                "STATUS_ERROR": "Failed to update articles",
                "STATUS_SKIPPED": "1 article with unpublished edits was skipped — open it to publish or discard. | {count} articles with unpublished edits were skipped — open them to publish or discard.",
                "STATUS_SKIPPED_ALL": "These articles have unpublished edits — open each to publish or discard.",
                "CATEGORY_SUCCESS": "Articles moved successfully",
                "CATEGORY_ERROR": "Failed to move articles",
                "DELETE_CONFIRM_TITLE": "Delete article | Delete {count} articles",
                "DELETE_CONFIRM_DESCRIPTION": "This will permanently delete the selected article. This action cannot be undone. | This will permanently delete {count} selected articles. This action cannot be undone.",
                "DELETE_CONFIRM": "Delete",
                "DELETE_SUCCESS": "Articles deleted successfully",
                "DELETE_ERROR": "Failed to delete articles"
            }
        },
        "CATEGORY_PAGE": {
            "CATEGORY_HEADER": {
                "NEW_CATEGORY": "New category",
                "EDIT_CATEGORY": "Edit category",
                "SEARCH_PLACEHOLDER": "Search categories...",
                "CATEGORIES_COUNT": "{n} category | {n} categories",
                "BREADCRUMB": {
                    "CATEGORY_LOCALE": "Categories ({localeCode})",
                    "ACTIVE_CATEGORY": "{categoryName} ({categoryCount} articles) | {categoryName} ({categoryCount} article)"
                }
            },
            "CATEGORY_EMPTY_STATE": {
                "TITLE": "No categories found",
                "SUBTITLE": "Categories will appear here. You can add a category by clicking the 'New Category' button."
            },
            "SEARCH_EMPTY_STATE": {
                "TITLE": "No matching categories",
                "SUBTITLE": "We couldn't find any categories matching your search. Try a different term."
            },
            "CATEGORY_CARD": {
                "ARTICLES_COUNT": "{count} article | {count} articles"
            },
            "CATEGORY_DIALOG": {
                "CREATE": {
                    "API": {
                        "SUCCESS_MESSAGE": "Category created successfully",
                        "ERROR_MESSAGE": "Unable to create category"
                    }
                },
                "EDIT": {
                    "API": {
                        "SUCCESS_MESSAGE": "Category updated successfully",
                        "ERROR_MESSAGE": "Unable to update category"
                    }
                },
                "DELETE": {
                    "API": {
                        "SUCCESS_MESSAGE": "Category deleted successfully",
                        "ERROR_MESSAGE": "Unable to delete category"
                    }
                },
                "HEADER": {
                    "CREATE": "Create category",
                    "EDIT": "Edit category",
                    "DESCRIPTION": "Editing a category will update the category in the public facing portal.",
                    "PORTAL": "Portal",
                    "LOCALE": "Locale"
                },
                "FORM": {
                    "NAME": {
                        "LABEL": "Name",
                        "PLACEHOLDER": "Category name",
                        "ERROR": "Name is required"
                    },
                    "SLUG": {
                        "LABEL": "Slug",
                        "PLACEHOLDER": "Category slug for urls",
                        "ERROR": "Slug is required",
                        "HELP_TEXT": "yona.vn/hc/{portalSlug}/{localeCode}/categories/{categorySlug}"
                    },
                    "DESCRIPTION": {
                        "LABEL": "Description",
                        "PLACEHOLDER": "Give a short description about the category.",
                        "ERROR": "Description is required"
                    }
                },
                "BUTTONS": {
                    "CREATE": "Create",
                    "EDIT": "Update",
                    "CANCEL": "Cancel"
                }
            }
        },
        "LOCALES_PAGE": {
            "LOCALES_COUNT": "No locales available | {n} locale | {n} locales",
            "NEW_LOCALE_BUTTON_TEXT": "New locale",
            "SEARCH_PLACEHOLDER": "Search locales...",
            "SEARCH_EMPTY_STATE": {
                "TITLE": "No matching locales",
                "SUBTITLE": "We couldn't find any locales matching your search. Try a different term."
            },
            "LOCALE_CARD": {
                "ARTICLES_COUNT": "{count} article | {count} articles",
                "CATEGORIES_COUNT": "{count} category | {count} categories",
                "DEFAULT": "Default",
                "DRAFT": "Draft",
                "DROPDOWN_MENU": {
                    "MAKE_DEFAULT": "Make default",
                    "MOVE_TO_DRAFT": "Move to draft",
                    "PUBLISH_LOCALE": "Publish locale",
                    "CUSTOMIZE_CONTENT": "Localize content",
                    "SELECT_POPULAR_CONTENT": "Select recommended content",
                    "DELETE": "Delete"
                }
            },
            "POPULAR_CONTENT_DIALOG": {
                "TITLE": "Recommended content",
                "DESCRIPTION": "Pick up to 3 categories and 6 articles to feature on this locale's help center home page. Drag them into the order you want visitors to see.",
                "SEARCH": "Search...",
                "EMPTY": "No matching results",
                "ADD_ANOTHER": "Add another...",
                "SLOTS_LEFT": "{count} slots left",
                "OVERRIDING_DEFAULTS": "Overriding defaults for this locale",
                "CONFIRM": "Save recommendations",
                "CATEGORIES": {
                    "LABEL": "Recommended categories",
                    "ARTICLES_COUNT": "No articles | {count} article | {count} articles"
                },
                "ARTICLES": {
                    "LABEL": "Recommended articles",
                    "IN_CATEGORY": "in {category}",
                    "UNCATEGORIZED": "Uncategorized"
                },
                "API": {
                    "SUCCESS_MESSAGE": "Recommended content updated successfully",
                    "ERROR_MESSAGE": "Unable to update recommended content. Try again."
                }
            },
            "CONTENT_DIALOG": {
                "TITLE": "Localize content",
                "DESCRIPTION": "Set values specific to this locale. Anything left blank falls back to the default locale.",
                "NAME": {
                    "LABEL": "Name"
                },
                "PAGE_TITLE": {
                    "LABEL": "Page title"
                },
                "HEADER_TEXT": {
                    "LABEL": "Header text"
                },
                "API": {
                    "SUCCESS_MESSAGE": "Locale content updated successfully",
                    "ERROR_MESSAGE": "Unable to update locale content. Try again."
                }
            },
            "ADD_LOCALE_DIALOG": {
                "TITLE": "Add a new locale",
                "DESCRIPTION": "Select the language in which this article will be written. This will be added to your list of translations, and you can add more later.",
                "COMBOBOX": {
                    "PLACEHOLDER": "Select locale..."
                },
                "STATUS": {
                    "LABEL": "Status",
                    "OPTIONS": {
                        "LIVE": "Published",
                        "DRAFT": "Draft"
                    }
                },
                "API": {
                    "SUCCESS_MESSAGE": "Locale added successfully",
                    "ERROR_MESSAGE": "Unable to add locale. Try again."
                }
            }
        },
        "EDIT_ARTICLE_PAGE": {
            "HEADER": {
                "STATUS": {
                    "SAVING": "Saving...",
                    "SAVED": "Saved"
                },
                "PREVIEW": "Preview",
                "PUBLISH": "Publish",
                "PUBLISH_CHANGES": "Publish changes",
                "PUBLISH_CHANGES_SUCCESS": "Changes published successfully",
                "PUBLISH_CHANGES_ERROR": "Could not publish changes",
                "SAVE_IN_PROGRESS": "Still saving your latest changes — please try again in a moment.",
                "DISCARD_CHANGES": "Discard changes",
                "DISCARD_CHANGES_SUCCESS": "Changes discarded",
                "DISCARD_CHANGES_ERROR": "Could not discard changes",
                "PENDING_CHANGES": "Pending changes",
                "VIEW_CHANGES": "View unpublished changes",
                "DRAFT": "Draft",
                "ARCHIVE": "Archive",
                "BACK_TO_ARTICLES": "Back to articles"
            },
            "PENDING_CHANGES_POPOVER": {
                "TITLE": "Unpublished changes",
                "DESCRIPTION": "This article has draft changes that aren't live yet. Apply them before changing the status, or discard them?",
                "APPLY": "Apply changes",
                "DISCARD": "Discard changes"
            },
            "DIFF_DIALOG": {
                "TITLE": "Unpublished changes",
                "DESCRIPTION": "Compare your draft against the version that's currently live.",
                "TITLE_LABEL": "Title"
            },
            "EDIT_ARTICLE": {
                "MORE_PROPERTIES": "More properties",
                "UNCATEGORIZED": "Uncategorized",
                "EDITOR_PLACEHOLDER": "Write your content here. Type '/' for formatting options."
            },
            "ARTICLE_PROPERTIES": {
                "ARTICLE_PROPERTIES": "Article properties",
                "META_DESCRIPTION": "Meta description",
                "META_DESCRIPTION_PLACEHOLDER": "Add meta description",
                "META_TITLE": "Meta title",
                "META_TITLE_PLACEHOLDER": "Add meta title",
                "META_TAGS": "Meta tags",
                "META_TAGS_PLACEHOLDER": "Add meta tags"
            },
            "API": {
                "ERROR": "Error while saving article"
            }
        },
        "PORTAL_SWITCHER": {
            "NEW_PORTAL": "New portal",
            "PORTALS": "Portals",
            "CREATE_PORTAL": "Create and manage multiple portals",
            "ARTICLES": "articles",
            "DOMAIN": "domain",
            "PORTAL_NAME": "Portal name"
        },
        "CREATE_PORTAL_DIALOG": {
            "TITLE": "Create new portal",
            "DESCRIPTION": "Give your portal a name and create a user-friendly URL slug. You can modify both later in the settings.",
            "CONFIRM_BUTTON_LABEL": "Create",
            "NAME": {
                "LABEL": "Name",
                "PLACEHOLDER": "User Guide | Acme",
                "MESSAGE": "Choose an name for your portal.",
                "ERROR": "Name is required"
            },
            "SLUG": {
                "LABEL": "Slug",
                "PLACEHOLDER": "user-guide",
                "ERROR": "Slug is required",
                "FORMAT_ERROR": "Please enter a valid slug, for eg: user-guide"
            }
        },
        "PORTAL_SETTINGS": {
            "FORM": {
                "AVATAR": {
                    "LABEL": "Logo",
                    "IMAGE_UPLOAD_ERROR": "Couldn't upload image! Try again",
                    "IMAGE_UPLOAD_SUCCESS": "Image added successfully. Please click on save changes to save the logo",
                    "IMAGE_DELETE_SUCCESS": "Logo deleted successfully",
                    "IMAGE_DELETE_ERROR": "Unable to delete logo",
                    "IMAGE_UPLOAD_SIZE_ERROR": "Image size should be less than {size}MB"
                },
                "NAME": {
                    "LABEL": "Name",
                    "PLACEHOLDER": "Portal name",
                    "ERROR": "Name is required"
                },
                "HEADER_TEXT": {
                    "LABEL": "Header text",
                    "PLACEHOLDER": "Portal header text"
                },
                "PAGE_TITLE": {
                    "LABEL": "Page title",
                    "PLACEHOLDER": "Portal page title"
                },
                "HOME_PAGE_LINK": {
                    "LABEL": "Home page link",
                    "PLACEHOLDER": "Portal home page link",
                    "ERROR": "Enter a valid URL. The Home page link must start with 'http://' or 'https://'."
                },
                "SLUG": {
                    "LABEL": "Slug",
                    "PLACEHOLDER": "Portal slug"
                },
                "BRAND_COLOR": {
                    "LABEL": "Brand color"
                },
                "SAVE_CHANGES": "Save changes"
            },
            "CONFIGURATION_FORM": {
                "CUSTOM_DOMAIN": {
                    "HEADER": "Custom domain",
                    "LABEL": "Custom domain:",
                    "DESCRIPTION": "You can host your portal on a custom domain. For instance, if your website is yourdomain.com and you want your portal available at docs.yourdomain.com, simply enter that in this field.",
                    "STATUS_DESCRIPTION": "Your custom portal will start working as soon as it is verified.",
                    "PLACEHOLDER": "Portal custom domain",
                    "EDIT_BUTTON": "Edit",
                    "ADD_BUTTON": "Add custom domain",
                    "STATUS": {
                        "LIVE": "Live",
                        "PENDING": "Awaiting verification",
                        "ERROR": "Verification failed"
                    },
                    "DIALOG": {
                        "ADD_HEADER": "Add custom domain",
                        "EDIT_HEADER": "Edit custom domain",
                        "ADD_CONFIRM_BUTTON_LABEL": "Add domain",
                        "EDIT_CONFIRM_BUTTON_LABEL": "Update domain",
                        "LABEL": "Custom domain",
                        "PLACEHOLDER": "Portal custom domain",
                        "ERROR": "Custom domain is required",
                        "FORMAT_ERROR": "Please enter a valid domain URL e.g. docs.yourdomain.com"
                    },
                    "DNS_CONFIGURATION_DIALOG": {
                        "HEADER": "DNS configuration",
                        "DESCRIPTION": "Log in to your DNS provider and add the CNAME record below for your subdomain.",
                        "COPY": "Successfully copied CNAME",
                        "SEND_INSTRUCTIONS": {
                            "HEADER": "Send instructions",
                            "DESCRIPTION": "If you would prefer to have someone from your development team to handle this step, you can enter email address below, and we will send them the required instructions.",
                            "PLACEHOLDER": "Enter their email",
                            "ERROR": "Enter a valid email address",
                            "SEND_BUTTON": "Send"
                        }
                    }
                },
                "DELETE_PORTAL": {
                    "BUTTON": "Delete {portalName}",
                    "HEADER": "Delete portal",
                    "DESCRIPTION": "Permanently delete this portal. This action is irreversible",
                    "DIALOG": {
                        "HEADER": "Sure you want to delete {portalName}?",
                        "DESCRIPTION": "This is a permanent action that cannot be reversed.",
                        "CONFIRM_BUTTON_LABEL": "Delete"
                    }
                },
                "EDIT_CONFIGURATION": "Edit configuration"
            },
            "LAYOUT_CONTENT": {
                "HEADER": "Appearance",
                "DESCRIPTION": "Pick the layout that fits how your visitors read.",
                "LAYOUT": {
                    "CLASSIC": {
                        "TITLE": "Classic",
                        "DESCRIPTION": "A welcoming home page with search and featured topics."
                    },
                    "SIDEBAR": {
                        "TITLE": "Documentation",
                        "DESCRIPTION": "Side-by-side navigation that keeps every guide a click away."
                    }
                },
                "SOCIAL_LINKS": {
                    "HEADER": "Social links",
                    "DESCRIPTION": "Add the handle for each network and your help center builds the full link. Shown in the documentation layout footer.",
                    "PLACEHOLDER": "handle",
                    "ADD": "Add social link",
                    "REMOVE": "Remove"
                },
                "SAVE": "Save changes"
            },
            "INTEGRATIONS": {
                "HEADER": "Integrations",
                "DESCRIPTION": "Connect tools that extend what your help center can do.",
                "LIVE_CHAT": {
                    "TITLE": "Live chat with {installationName}",
                    "DESCRIPTION": "Show a live chat widget on your help center so visitors can reach you while they read.",
                    "PLACEHOLDER": "Select live chat widget",
                    "NONE_OPTION": "No widget"
                },
                "GTM": {
                    "TITLE": "Google Tag Manager",
                    "DESCRIPTION": "Add analytics and marketing tags by connecting your Tag Manager container.",
                    "PLACEHOLDER": "GTM-XXXXXXX",
                    "HELP": "Find this in your Google Tag Manager workspace. Leave empty to disable.",
                    "INVALID": "Enter a valid container ID, for example GTM-XXXXXXX."
                },
                "GA4": {
                    "TITLE": "Google Analytics 4",
                    "DESCRIPTION": "Measure traffic and visitor behavior on your help center with Google Analytics.",
                    "PLACEHOLDER": "G-XXXXXXXXXX",
                    "HELP": "Find the measurement ID under Admin → Data streams in Google Analytics. Leave empty to disable.",
                    "INVALID": "Enter a valid measurement ID, for example G-XXXXXXXXXX."
                },
                "HOTJAR": {
                    "TITLE": "Hotjar",
                    "DESCRIPTION": "Understand how visitors use your help center with heatmaps and session recordings.",
                    "PLACEHOLDER": "1234567",
                    "HELP": "Find your site ID under Sites & organizations in Hotjar. Leave empty to disable.",
                    "INVALID": "Enter a numeric Hotjar site ID."
                },
                "PLAUSIBLE": {
                    "TITLE": "Plausible",
                    "DESCRIPTION": "Track help center traffic with privacy-friendly Plausible Analytics.",
                    "PLACEHOLDER": "example.com",
                    "HELP": "Enter the domain configured in your Plausible site settings. Leave empty to disable.",
                    "INVALID": "Enter a valid domain, for example example.com."
                },
                "AMPLITUDE": {
                    "TITLE": "Amplitude",
                    "DESCRIPTION": "Analyze visitor behavior on your help center with Amplitude.",
                    "PLACEHOLDER": "0123456789abcdef0123456789abcdef",
                    "HELP": "Find the API key in your Amplitude project settings. Leave empty to disable.",
                    "INVALID": "Enter a valid Amplitude API key."
                },
                "CLARITY": {
                    "TITLE": "Microsoft Clarity",
                    "DESCRIPTION": "Capture heatmaps and session recordings with Microsoft Clarity.",
                    "PLACEHOLDER": "abcd1234ef",
                    "HELP": "Find the project ID in your Clarity project settings. Leave empty to disable.",
                    "INVALID": "Enter a valid Clarity project ID."
                },
                "META_PIXEL": {
                    "TITLE": "Meta Pixel",
                    "DESCRIPTION": "Measure ad conversions and build audiences from help center visits with Meta Pixel.",
                    "PLACEHOLDER": "123456789012345",
                    "HELP": "Find the pixel ID in Meta Events Manager. Leave empty to disable.",
                    "INVALID": "Enter a numeric pixel ID."
                },
                "SAVE": "Save changes"
            },
            "NAV": {
                "GENERAL": "General",
                "DOMAIN": "Domain",
                "APPEARANCE": "Appearance",
                "INTEGRATIONS": "Integrations"
            },
            "API": {
                "CREATE_PORTAL": {
                    "SUCCESS_MESSAGE": "Portal created successfully",
                    "ERROR_MESSAGE": "Unable to create portal"
                },
                "UPDATE_PORTAL": {
                    "SUCCESS_MESSAGE": "Portal updated successfully",
                    "ERROR_MESSAGE": "Unable to update portal"
                }
            }
        },
        "PDF_UPLOAD": {
            "TITLE": "Upload PDF Document",
            "DESCRIPTION": "Upload a PDF document to automatically generate FAQs using AI",
            "DRAG_DROP_TEXT": "Drag and drop your PDF file here, or click to select",
            "SELECT_FILE": "Select PDF File",
            "ADDITIONAL_CONTEXT_LABEL": "Additional Context (Optional)",
            "ADDITIONAL_CONTEXT_PLACEHOLDER": "Provide any additional context or instructions for FAQ generation...",
            "UPLOADING": "Uploading...",
            "UPLOAD": "Upload & Process",
            "CANCEL": "Cancel",
            "ERROR_INVALID_TYPE": "Please select a valid PDF file",
            "ERROR_FILE_TOO_LARGE": "File size must be less than 512MB",
            "ERROR_UPLOAD_FAILED": "Failed to upload PDF. Please try again."
        },
        "PDF_DOCUMENTS": {
            "TITLE": "PDF Documents",
            "DESCRIPTION": "Manage uploaded PDF documents and generate FAQs from them",
            "UPLOAD_PDF": "Upload PDF",
            "UPLOAD_FIRST_PDF": "Upload your first PDF",
            "UPLOADED_BY": "Uploaded by",
            "GENERATE_FAQS": "Generate FAQs",
            "GENERATING": "Generating...",
            "CONFIRM_DELETE": "Are you sure you want to delete {filename}?",
            "EMPTY_STATE": {
                "TITLE": "No PDF documents yet",
                "DESCRIPTION": "Upload PDF documents to automatically generate FAQs using AI"
            },
            "STATUS": {
                "UPLOADED": "Ready",
                "PROCESSING": "Processing",
                "PROCESSED": "Completed",
                "FAILED": "Failed"
            }
        },
        "CONTENT_GENERATION": {
            "TITLE": "Content Generation",
            "DESCRIPTION": "Upload PDF documents to automatically generate FAQ content using AI",
            "UPLOAD_TITLE": "Upload PDF Document",
            "DRAG_DROP": "Drag and drop your PDF file here, or click to select",
            "SELECT_FILE": "Select PDF File",
            "UPLOADING": "Processing document...",
            "UPLOAD_SUCCESS": "Document processed successfully!",
            "UPLOAD_ERROR": "Failed to upload document. Please try again.",
            "INVALID_FILE_TYPE": "Please select a valid PDF file",
            "FILE_TOO_LARGE": "File size must be less than 512MB",
            "GENERATED_CONTENT": "Generated FAQ Content",
            "PUBLISH_SELECTED": "Publish Selected",
            "PUBLISHING": "Publishing...",
            "FROM_DOCUMENT": "From document",
            "NO_CONTENT": "No generated content available. Upload a PDF document to get started.",
            "LOADING": "Loading generated content..."
        }
    },
    "INBOX": {
        "LIST": {
            "TITLE": "Notifications",
            "DISPLAY_DROPDOWN": "Display",
            "LOADING": "Fetching notifications",
            "404": "There are no active notifications in this group.",
            "NO_NOTIFICATIONS": "No notifications",
            "NOTE": "Notifications from all subscribed inboxes",
            "NO_MESSAGES_AVAILABLE": "Oops! Not able to fetch messages",
            "SNOOZED_UNTIL": "Snoozed until",
            "SNOOZED_UNTIL_TOMORROW": "Snoozed until tomorrow",
            "SNOOZED_UNTIL_NEXT_WEEK": "Snoozed until next week"
        },
        "ACTION_HEADER": {
            "SNOOZE": "Snooze notification",
            "DELETE": "Delete notification",
            "BACK": "Back"
        },
        "TYPES": {
            "CONVERSATION_MENTION": "You have been mentioned in a conversation",
            "CONVERSATION_CREATION": "New conversation created",
            "CONVERSATION_ASSIGNMENT": "A conversation has been assigned to you",
            "ASSIGNED_CONVERSATION_NEW_MESSAGE": "New message in an assigned conversation",
            "PARTICIPATING_CONVERSATION_NEW_MESSAGE": "New message in a conversation you are participating in",
            "SLA_MISSED_FIRST_RESPONSE": "SLA target first response missed for conversation",
            "SLA_MISSED_NEXT_RESPONSE": "SLA target next response missed for conversation",
            "SLA_MISSED_RESOLUTION": "SLA target resolution missed for conversation"
        },
        "TYPES_NEXT": {
            "CONVERSATION_MENTION": "Mentioned",
            "CONVERSATION_ASSIGNMENT": "Assigned to you",
            "CONVERSATION_CREATION": "New Conversation",
            "SLA_MISSED_FIRST_RESPONSE": "SLA breach",
            "SLA_MISSED_NEXT_RESPONSE": "SLA breach",
            "SLA_MISSED_RESOLUTION": "SLA breach",
            "PARTICIPATING_CONVERSATION_NEW_MESSAGE": "New message",
            "ASSIGNED_CONVERSATION_NEW_MESSAGE": "New message",
            "FRIEND_REQUEST": "Friend request",
            "FRIEND_REQUEST_ACCEPTED": "New friend",
            "SNOOZED_UNTIL": "Snoozed for {time}",
            "SNOOZED_ENDS": "Snooze ended"
        },
        "NO_CONTENT": "No content available",
        "MENU_ITEM": {
            "MARK_AS_READ": "Mark as read",
            "MARK_AS_UNREAD": "Mark as unread",
            "SNOOZE": "Snooze",
            "DELETE": "Delete",
            "MARK_ALL_READ": "Mark all as read",
            "DELETE_ALL": "Delete all",
            "DELETE_ALL_READ": "Delete all read"
        },
        "DISPLAY_MENU": {
            "SORT": "Sort",
            "DISPLAY": "Display :",
            "SORT_OPTIONS": {
                "NEWEST": "Newest",
                "OLDEST": "Oldest",
                "PRIORITY": "Priority"
            },
            "DISPLAY_OPTIONS": {
                "SNOOZED": "Snoozed",
                "READ": "Read",
                "LABELS": "Labels",
                "CONVERSATION_ID": "Conversation ID"
            }
        },
        "ALERTS": {
            "MARK_AS_READ": "Notification marked as read",
            "MARK_AS_UNREAD": "Notification marked as unread",
            "SNOOZE": "Notification snoozed",
            "DELETE": "Notification deleted",
            "MARK_ALL_READ": "All notifications marked as read",
            "DELETE_ALL": "All notifications deleted",
            "DELETE_ALL_READ": "All read notifications deleted"
        },
        "BELL": {
            "OPEN_LABEL": "Notifications, {count} unread",
            "EMPTY": "No notifications yet",
            "VIEW_ALL": "View all notifications",
            "TAB_UNREAD": "Unread",
            "TAB_ALL": "All",
            "EMPTY_UNREAD": "You are all caught up"
        }
    },
    "INBOX_MGMT": {
        "HEADER": "Inboxes",
        "DESCRIPTION": "A channel is the mode of communication your customer chooses to interact with you. An inbox is where you manage interactions for a specific channel. It can include communications from various sources such as email, live chat, and social media.",
        "LEARN_MORE": "Learn more about inboxes",
        "COUNT": "{n} inbox | {n} inboxes",
        "SEARCH_PLACEHOLDER": "Search inboxes...",
        "NO_RESULTS": "No inboxes found matching your search",
        "RECONNECTION_REQUIRED": "Your inbox is disconnected. You won't receive new messages until you reauthorize it.",
        "CLICK_TO_RECONNECT": "Click here to reconnect.",
        "WHATSAPP_REGISTRATION_INCOMPLETE": "Your WhatsApp Business registration isn’t complete. Please check your display name status in Meta Business Manager before reconnecting.",
        "COMPLETE_REGISTRATION": "Complete Registration",
        "LIST": {
            "404": "There are no inboxes attached to this account."
        },
        "CREATE_FLOW": {
            "CHANNEL": {
                "TITLE": "Choose Channel",
                "BODY": "Choose the provider you want to integrate with {installationName}."
            },
            "INBOX": {
                "TITLE": "Create Inbox",
                "BODY": "Authenticate your account and create an inbox."
            },
            "AGENT": {
                "TITLE": "Add Agents",
                "BODY": "Add agents to the created inbox."
            },
            "FINISH": {
                "TITLE": "Voilà!",
                "BODY": "You are all set to go!"
            }
        },
        "ADD": {
            "CHANNEL_NAME": {
                "LABEL": "Inbox Name",
                "PLACEHOLDER": "Enter your inbox name (eg: Acme Inc)",
                "ERROR": "Please enter a valid inbox name"
            },
            "WEBSITE_NAME": {
                "LABEL": "Website Name",
                "PLACEHOLDER": "Enter your website name (eg: Acme Inc)"
            },
            "FB": {
                "CONNECT_YOUR_FACEBOOK_PAGE": "Connect your Facebook Page",
                "CONTINUE_WITH_FACEBOOK": "Continue with Facebook",
                "HELP": "{installationName} only accesses messages of the Pages you choose and never reads your personal messages.",
                "CHOOSE_PAGE": "Choose Page",
                "CHOOSE_PLACEHOLDER": "Select a page from the list",
                "INBOX_NAME": "Inbox Name",
                "ADD_NAME": "Add a name for your inbox",
                "PICK_NAME": "Pick a Name for your Inbox",
                "PICK_A_VALUE": "Pick a value",
                "CREATE_INBOX": "Create Inbox",
                "RESTRICTED_WARNING": "Facebook inbox creation is temporarily unavailable due to an API-level issue on Meta’s side, not a problem with {installationName}. We’re working closely with Meta to resolve it as quickly as possible.",
                "STATUS_LINK": "View status updates"
            },
            "INSTAGRAM": {
                "CONTINUE_WITH_INSTAGRAM": "Continue with Instagram",
                "CONNECT_YOUR_INSTAGRAM_PROFILE": "Connect your Instagram Profile",
                "HELP": "To add your Instagram profile as a channel, you need to authenticate your Instagram Profile by clicking on 'Continue with Instagram' ",
                "ERROR_MESSAGE": "There was an error connecting to Instagram, please try again",
                "ERROR_AUTH": "There was an error connecting to Instagram, please try again",
                "NEW_INBOX_SUGGESTION": "This Instagram account was previously linked to a different inbox and has now been migrated here. All new messages will appear here. The old inbox will no longer be able to send or receive messages for this account.",
                "DUPLICATE_INBOX_BANNER": "This Instagram account was migrated to the new Instagram channel inbox. You won’t be able to send/receive Instagram messages from this inbox anymore.",
                "RESTRICTED_WARNING": "Instagram inbox creation is temporarily unavailable due to an API-level issue on Meta’s side, not a problem with {installationName}. We’re working closely with Meta to resolve it as quickly as possible.",
                "SETTINGS_RESTRICTED_WARNING": "Instagram messaging is currently affected by an API-level issue on Meta’s side, not a problem with {installationName}. Some messages or actions may be delayed or unavailable. We’re working closely with Meta to resolve it as quickly as possible.",
                "STATUS_LINK": "View status updates"
            },
            "TIKTOK": {
                "CONTINUE_WITH_TIKTOK": "Continue with TikTok",
                "CONNECT_YOUR_TIKTOK_PROFILE": "Connect your TikTok Profile",
                "HELP": "To add your TikTok profile as a channel, you need to authenticate your TikTok Profile by clicking on 'Continue with TikTok' ",
                "ERROR_MESSAGE": "There was an error connecting to TikTok, please try again",
                "ERROR_AUTH": "There was an error connecting to TikTok, please try again",
                "NORTH_AMERICA_WARNING": "TikTok connections for North American accounts are temporarily unavailable while we wait for an update from the TikTok team."
            },
            "TWITTER": {
                "HELP": "To add your Twitter profile as a channel, you need to authenticate your Twitter Profile by clicking on 'Sign in with Twitter' ",
                "ERROR_MESSAGE": "There was an error connecting to Twitter, please try again",
                "TWEETS": {
                    "ENABLE": "Create conversations from mentioned Tweets"
                }
            },
            "WEBSITE_CHANNEL": {
                "TITLE": "Website channel",
                "DESC": "Create a channel for your website and start supporting your customers via our website widget.",
                "LOADING_MESSAGE": "Creating Website Support Channel",
                "CHANNEL_AVATAR": {
                    "LABEL": "Channel Avatar"
                },
                "CHANNEL_WEBHOOK_URL": {
                    "LABEL": "Webhook URL",
                    "PLACEHOLDER": "Please enter your Webhook URL",
                    "ERROR": "Please enter a valid URL"
                },
                "CHANNEL_WEBHOOK_SECRET": {
                    "LABEL": "Webhook Secret",
                    "COPY": "Copy secret to clipboard",
                    "COPY_SUCCESS": "Secret copied to clipboard",
                    "TOGGLE": "Toggle secret visibility",
                    "RESET_SUCCESS": "Webhook secret regenerated successfully",
                    "RESET_ERROR": "Unable to regenerate webhook secret. Please try again"
                },
                "CHANNEL_DOMAIN": {
                    "LABEL": "Website Domain",
                    "PLACEHOLDER": "Enter your website domain (eg: acme.com)"
                },
                "CHANNEL_WELCOME_TITLE": {
                    "LABEL": "Welcome Heading",
                    "PLACEHOLDER": "Hi there !",
                    "HELP_TEXT": "The large heading visitors see on the widget before any message is sent."
                },
                "CHANNEL_WELCOME_TAGLINE": {
                    "LABEL": "Welcome Tagline",
                    "PLACEHOLDER": "We make it simple to connect with us. Ask us anything, or share your feedback.",
                    "HELP_TEXT": "Shown right below the welcome heading, as plain text."
                },
                "CHANNEL_GREETING_MESSAGE": {
                    "LABEL": "Channel greeting message",
                    "PLACEHOLDER": "Acme Inc typically replies in a few hours."
                },
                "CHANNEL_GREETING_TOGGLE": {
                    "LABEL": "Enable channel greeting",
                    "HELP_TEXT": "Auto-send greeting messages when customers start a conversation and send their first message.",
                    "ENABLED": "Enabled",
                    "DISABLED": "Disabled"
                },
                "REPLY_TIME": {
                    "TITLE": "Set Reply time",
                    "IN_A_FEW_MINUTES": "In a few minutes",
                    "IN_A_FEW_HOURS": "In a few hours",
                    "IN_A_DAY": "In a day",
                    "HELP_TEXT": "Shown in the status line at the top of the widget so visitors know how soon to expect a reply."
                },
                "WIDGET_COLOR": {
                    "LABEL": "Widget Color",
                    "PLACEHOLDER": "Update the widget color used in widget"
                },
                "SUBMIT_BUTTON": "Create inbox",
                "API": {
                    "ERROR_MESSAGE": "We were not able to create a website channel, please try again"
                }
            },
            "TWILIO": {
                "TITLE": "Twilio SMS/WhatsApp Channel",
                "DESC": "Integrate Twilio and start supporting your customers via SMS or WhatsApp.",
                "ACCOUNT_SID": {
                    "LABEL": "Account SID",
                    "PLACEHOLDER": "Please enter your Twilio Account SID",
                    "ERROR": "This field is required"
                },
                "API_KEY": {
                    "USE_API_KEY": "Use API Key Authentication",
                    "LABEL": "API Key SID",
                    "PLACEHOLDER": "Please enter your API Key SID",
                    "ERROR": "This field is required"
                },
                "API_KEY_SECRET": {
                    "LABEL": "API Key Secret",
                    "PLACEHOLDER": "Please enter your API Key Secret",
                    "ERROR": "This field is required"
                },
                "MESSAGING_SERVICE_SID": {
                    "LABEL": "Messaging Service SID",
                    "PLACEHOLDER": "Please enter your Twilio Messaging Service SID",
                    "ERROR": "This field is required",
                    "USE_MESSAGING_SERVICE": "Use a Twilio Messaging Service"
                },
                "CHANNEL_TYPE": {
                    "LABEL": "Channel Type",
                    "ERROR": "Please select your Channel Type"
                },
                "AUTH_TOKEN": {
                    "LABEL": "Auth Token",
                    "PLACEHOLDER": "Please enter your Twilio Auth Token",
                    "ERROR": "This field is required"
                },
                "CHANNEL_NAME": {
                    "LABEL": "Inbox Name",
                    "PLACEHOLDER": "Please enter a inbox name",
                    "ERROR": "This field is required"
                },
                "PHONE_NUMBER": {
                    "LABEL": "Phone Number",
                    "PLACEHOLDER": "Please enter the phone number from which message will be sent.",
                    "ERROR": "Please provide a valid phone number that starts with a `+` sign and does not contain any spaces."
                },
                "API_CALLBACK": {
                    "TITLE": "Callback URL",
                    "SUBTITLE": "You have to configure the message callback URL in Twilio with the URL mentioned here."
                },
                "SUBMIT_BUTTON": "Create Twilio Channel",
                "API": {
                    "ERROR_MESSAGE": "We were not able to authenticate Twilio credentials, please try again"
                }
            },
            "SMS": {
                "TITLE": "SMS Channel",
                "DESC": "Start supporting your customers via SMS.",
                "PROVIDERS": {
                    "LABEL": "API Provider",
                    "TWILIO": "Twilio",
                    "BANDWIDTH": "Bandwidth"
                },
                "API": {
                    "ERROR_MESSAGE": "We were not able to save the SMS channel"
                },
                "BANDWIDTH": {
                    "ACCOUNT_ID": {
                        "LABEL": "Account ID",
                        "PLACEHOLDER": "Please enter your Bandwidth Account ID",
                        "ERROR": "This field is required"
                    },
                    "API_KEY": {
                        "LABEL": "API Key",
                        "PLACEHOLDER": "Please enter your Bandwidth API Key",
                        "ERROR": "This field is required"
                    },
                    "API_SECRET": {
                        "LABEL": "API Secret",
                        "PLACEHOLDER": "Please enter your Bandwidth API Secret",
                        "ERROR": "This field is required"
                    },
                    "APPLICATION_ID": {
                        "LABEL": "Application ID",
                        "PLACEHOLDER": "Please enter your Bandwidth Application ID",
                        "ERROR": "This field is required"
                    },
                    "INBOX_NAME": {
                        "LABEL": "Inbox Name",
                        "PLACEHOLDER": "Please enter a inbox name",
                        "ERROR": "This field is required"
                    },
                    "PHONE_NUMBER": {
                        "LABEL": "Phone number",
                        "PLACEHOLDER": "Please enter the phone number from which message will be sent.",
                        "ERROR": "Please provide a valid phone number that starts with a `+` sign and does not contain any spaces."
                    },
                    "SUBMIT_BUTTON": "Create Bandwidth Channel",
                    "API": {
                        "ERROR_MESSAGE": "We were not able to authenticate Bandwidth credentials, please try again"
                    },
                    "API_CALLBACK": {
                        "TITLE": "Callback URL",
                        "SUBTITLE": "You have to configure the message callback URL in Bandwidth with the URL mentioned here."
                    }
                }
            },
            "WHATSAPP": {
                "TITLE": "WhatsApp Channel",
                "DESC": "Start supporting your customers via WhatsApp.",
                "PROVIDERS": {
                    "LABEL": "API Provider",
                    "WHATSAPP_EMBEDDED": "WhatsApp Business",
                    "TWILIO": "Twilio",
                    "WHATSAPP_CLOUD": "WhatsApp Cloud",
                    "WHATSAPP_CLOUD_DESC": "Quick setup through Meta",
                    "WHATSAPP_CLOUD_MANUAL_SETUP_DESC": "Manual setup with Cloud API credentials",
                    "TWILIO_DESC": "Connect via Twilio credentials",
                    "360_DIALOG": "360Dialog"
                },
                "SELECT_PROVIDER": {
                    "TITLE": "Select your API provider",
                    "DESCRIPTION": "Choose your WhatsApp provider. You can connect directly through Meta which requires no setup, or connect through Twilio using your account credentials.",
                    "RESTRICTION_DESCRIPTION": "Choose your WhatsApp provider. You can connect WhatsApp Cloud manually using your Cloud API credentials, or connect through Twilio using your account credentials."
                },
                "INBOX_NAME": {
                    "LABEL": "Inbox Name",
                    "PLACEHOLDER": "Please enter an inbox name",
                    "ERROR": "This field is required"
                },
                "PHONE_NUMBER": {
                    "LABEL": "Phone number",
                    "PLACEHOLDER": "Please enter the phone number from which message will be sent.",
                    "ERROR": "Please provide a valid phone number that starts with a `+` sign and does not contain any spaces."
                },
                "PHONE_NUMBER_ID": {
                    "LABEL": "Phone number ID",
                    "PLACEHOLDER": "Please enter the Phone number ID obtained from Facebook developer dashboard.",
                    "ERROR": "Please enter a valid value."
                },
                "BUSINESS_ACCOUNT_ID": {
                    "LABEL": "Business Account ID",
                    "PLACEHOLDER": "Please enter the Business Account ID obtained from Facebook developer dashboard.",
                    "ERROR": "Please enter a valid value."
                },
                "WEBHOOK_VERIFY_TOKEN": {
                    "LABEL": "Webhook Verify Token",
                    "PLACEHOLDER": "Enter a verify token which you want to configure for Facebook webhooks.",
                    "ERROR": "Please enter a valid value."
                },
                "API_KEY": {
                    "LABEL": "API key",
                    "SUBTITLE": "Configure the WhatsApp API key.",
                    "PLACEHOLDER": "API key",
                    "ERROR": "Please enter a valid value."
                },
                "API_CALLBACK": {
                    "TITLE": "Callback URL",
                    "SUBTITLE": "You have to configure the webhook URL and the verification token in the Facebook Developer portal with the values shown below.",
                    "WEBHOOK_URL": "Webhook URL",
                    "WEBHOOK_VERIFICATION_TOKEN": "Webhook Verification Token"
                },
                "SUBMIT_BUTTON": "Create WhatsApp Channel",
                "EMBEDDED_SIGNUP": {
                    "TITLE": "Quick setup with Meta",
                    "DESC": "Use Quick setup with Meta to connect a new number or an existing number from the WhatsApp Business app. You will be redirected to Meta to log into your WhatsApp Business account. Having admin access will help make the setup smooth and easy.",
                    "BENEFITS": {
                        "TITLE": "Benefits of Embedded Signup:",
                        "EASY_SETUP": "No manual configuration required",
                        "SECURE_AUTH": "Secure OAuth based authentication",
                        "AUTO_CONFIG": "Automatic webhook and phone number configuration"
                    },
                    "LEARN_MORE": {
                        "TEXT": "To learn more about quick setup, pricing, and limitations, visit {link}.",
                        "LINK_TEXT": "this link"
                    },
                    "SUBMIT_BUTTON": "Connect with WhatsApp Business",
                    "AUTH_PROCESSING": "Authenticating with Meta",
                    "WAITING_FOR_BUSINESS_INFO": "Please complete business setup in the Meta window...",
                    "PROCESSING": "Setting up your WhatsApp Business Account",
                    "ENABLING_CALLING": "Enabling WhatsApp Calling on your number…",
                    "LOADING_SDK": "Loading Facebook SDK...",
                    "CANCELLED": "WhatsApp Signup was cancelled",
                    "SUCCESS_TITLE": "WhatsApp Business Account Connected!",
                    "WAITING_FOR_AUTH": "Waiting for authentication...",
                    "INVALID_BUSINESS_DATA": "Invalid business data received from Facebook. Please try again.",
                    "SIGNUP_ERROR": "Signup error occurred",
                    "AUTH_NOT_COMPLETED": "Authentication not completed. Please restart the process.",
                    "SUCCESS_FALLBACK": "WhatsApp Business Account has been successfully configured",
                    "MANUAL_FALLBACK": "If your number is already connected to the WhatsApp Business Platform (API), or if you’re a tech provider onboarding your own number, please use the {link} flow",
                    "MANUAL_LINK_TEXT": "manual setup flow",
                    "ACCESS_REQUEST": {
                        "TITLE": "Quick setup with Meta",
                        "DESCRIPTION": "Connect a new number or an existing number from the WhatsApp Business app without manual configuration. To request this option, tell our team what your business does, how you’ll use WhatsApp, and which {installationName} account needs access.",
                        "FOOTNOTE": "We’ll review your request and let you know if this option can be enabled. You can also continue with manual setup below.",
                        "BUTTON": "Request access"
                    },
                    "RESTRICTED_WARNING": "WhatsApp Embedded Signup is temporarily unavailable due to an API-level issue on Meta’s side, not a problem with {installationName}. You can use manual setup for eligible Cloud API numbers. We’re working closely with Meta to resolve it as quickly as possible.",
                    "STATUS_LINK": "View status updates",
                    "CALLING_ENABLE_FAILED": "Your WhatsApp inbox is ready, but voice calling couldn't be turned on — this number isn't enrolled in the WhatsApp Business Calling API yet. Reach out to Meta or your WhatsApp Business Solution Provider to onboard it, then turn calling on from the inbox's Calls settings."
                },
                "API": {
                    "ERROR_MESSAGE": "We were not able to save the WhatsApp channel",
                    "MANUAL_RESTRICTION_WARNING": "WhatsApp Embedded Signup is temporarily unavailable due to an API-level issue on Meta’s side, not a problem with {installationName}. Manual setup works only for numbers already connected to WhatsApp Cloud API. Numbers using WhatsApp Business app coexistence are not supported in this flow yet. We’re working closely with Meta to resolve the issue as quickly as possible. Thanks for your patience.",
                    "STATUS_LINK": "View status updates"
                }
            },
            "VOICE": {
                "TITLE": "Voice Channel",
                "DESC": "Integrate Twilio Voice and start supporting your customers via phone calls.",
                "PHONE_NUMBER": {
                    "LABEL": "Phone Number",
                    "PLACEHOLDER": "Enter your phone number (e.g. +1234567890)",
                    "ERROR": "Please provide a valid phone number in E.164 format (e.g. +1234567890)"
                },
                "TWILIO": {
                    "ACCOUNT_SID": {
                        "LABEL": "Account SID",
                        "PLACEHOLDER": "Enter your Twilio Account SID",
                        "REQUIRED": "Account SID is required"
                    },
                    "AUTH_TOKEN": {
                        "LABEL": "Auth Token",
                        "PLACEHOLDER": "Enter your Twilio Auth Token",
                        "REQUIRED": "Auth Token is required"
                    },
                    "API_KEY_SID": {
                        "LABEL": "API Key SID",
                        "PLACEHOLDER": "Enter your Twilio API Key SID",
                        "REQUIRED": "API Key SID is required"
                    },
                    "API_KEY_SECRET": {
                        "LABEL": "API Key Secret",
                        "PLACEHOLDER": "Enter your Twilio API Key Secret",
                        "REQUIRED": "API Key Secret is required"
                    }
                },
                "CONFIGURATION": {
                    "TWILIO_VOICE_URL_TITLE": "Twilio Voice URL",
                    "TWILIO_VOICE_URL_SUBTITLE": "Configure this URL as the Voice URL on your Twilio phone number and TwiML App.",
                    "TWILIO_STATUS_URL_TITLE": "Twilio Status Callback URL",
                    "TWILIO_STATUS_URL_SUBTITLE": "Configure this URL as the Status Callback URL on your Twilio phone number."
                },
                "SUBMIT_BUTTON": "Create Voice Channel",
                "API": {
                    "ERROR_MESSAGE": "We were not able to create the voice channel"
                }
            },
            "API_CHANNEL": {
                "TITLE": "API Channel",
                "DESC": "Integrate with API channel and start supporting your customers.",
                "CHANNEL_NAME": {
                    "LABEL": "Channel Name",
                    "PLACEHOLDER": "Please enter a channel name",
                    "ERROR": "This field is required"
                },
                "WEBHOOK_URL": {
                    "LABEL": "Webhook URL",
                    "SUBTITLE": "Configure the URL where you want to receive callbacks on events.",
                    "PLACEHOLDER": "Webhook URL"
                },
                "SUBMIT_BUTTON": "Create API Channel",
                "API": {
                    "ERROR_MESSAGE": "We were not able to save the api channel"
                }
            },
            "EMAIL_CHANNEL": {
                "TITLE": "Email Channel",
                "DESC": "Integrate your email inbox.",
                "CHANNEL_NAME": {
                    "LABEL": "Channel Name",
                    "PLACEHOLDER": "Please enter a channel name",
                    "ERROR": "This field is required"
                },
                "EMAIL": {
                    "LABEL": "Email",
                    "SUBTITLE": "Provide the email address where your customers send support requests.",
                    "PLACEHOLDER": "Email"
                },
                "SUBMIT_BUTTON": "Create Email Channel",
                "API": {
                    "ERROR_MESSAGE": "We were not able to save the email channel"
                },
                "FINISH_MESSAGE": "Your email inbox has been created successfully! You can start forwarding your emails to the address below, or configure SMTP and IMAP credentials to send and receive emails directly.",
                "FINISH_MESSAGE_NO_FORWARDING": "Your email inbox has been created successfully! You need to configure SMTP and IMAP credentials to send and receive emails. Without these settings, no emails will be processed.",
                "FORWARDING_ADDRESS_LABEL": "Forward emails to this address:",
                "CONFIGURE_SMTP_IMAP_LINK": "Click here",
                "CONFIGURE_SMTP_IMAP_TEXT": " to configure IMAP and SMTP settings"
            },
            "LINE_CHANNEL": {
                "TITLE": "LINE Channel",
                "DESC": "Integrate with LINE channel and start supporting your customers.",
                "CHANNEL_NAME": {
                    "LABEL": "Channel Name",
                    "PLACEHOLDER": "Please enter a channel name",
                    "ERROR": "This field is required"
                },
                "LINE_CHANNEL_ID": {
                    "LABEL": "LINE Channel ID",
                    "PLACEHOLDER": "LINE Channel ID"
                },
                "LINE_CHANNEL_SECRET": {
                    "LABEL": "LINE Channel Secret",
                    "PLACEHOLDER": "LINE Channel Secret"
                },
                "LINE_CHANNEL_TOKEN": {
                    "LABEL": "LINE Channel Token",
                    "PLACEHOLDER": "LINE Channel Token"
                },
                "SUBMIT_BUTTON": "Create LINE Channel",
                "API": {
                    "ERROR_MESSAGE": "We were not able to save the LINE channel"
                },
                "API_CALLBACK": {
                    "TITLE": "Callback URL",
                    "SUBTITLE": "You have to configure the webhook URL in LINE application with the URL mentioned here."
                }
            },
            "ZALO_CHANNEL": {
                "TITLE": "Zalo personal account",
                "DESC": "Connect a personal Zalo account. Sign in once with a QR code and every conversation lands in this inbox.",
                "CHANNEL_NAME": {
                    "LABEL": "Inbox Name",
                    "PLACEHOLDER": "Enter your inbox name (eg: Zalo store)",
                    "ERROR": "Please enter a valid inbox name"
                },
                "SUBMIT_BUTTON": "Create Zalo Channel",
                "API": {
                    "ERROR_MESSAGE": "We were not able to create a Zalo channel, please try again"
                },
                "QR": {
                    "TITLE": "Sign in with QR code",
                    "DESC": "Open Zalo on your phone, go to the QR scanner and scan the code below.",
                    "STARTING": "Starting the sign-in session…",
                    "WAITING": "Generating the QR code…",
                    "SCANNED": "QR code scanned. Finishing the connection…",
                    "CONFIRMING": "Finishing the connection…",
                    "REFRESHING": "The QR code expired. Generating a new one…",
                    "EXPIRES_IN": "This code expires in {seconds}s",
                    "BOUND_ACCOUNT": "This inbox is connected to: {name}",
                    "CONNECTED": "Connected. Redirecting…",
                    "RETRY": "Show a new QR code",
                    "BRIDGE_DOWN": "The Zalo connection is temporarily unavailable. Try again in a few minutes, or contact support if it persists.",
                    "EXPIRED": "The QR code expired before it was scanned.",
                    "MISMATCH": "That QR code belongs to a different Zalo account. Scan the account already connected to this inbox."
                }
            },
            "TELEGRAM_CHANNEL": {
                "TITLE": "Telegram Channel",
                "DESC": "Integrate with Telegram channel and start supporting your customers.",
                "BOT_TOKEN": {
                    "LABEL": "Bot Token",
                    "SUBTITLE": "Configure the bot token you have obtained from Telegram BotFather.",
                    "PLACEHOLDER": "Bot Token"
                },
                "SUBMIT_BUTTON": "Create Telegram Channel",
                "API": {
                    "ERROR_MESSAGE": "We were not able to save the telegram channel"
                }
            },
            "AUTH": {
                "TITLE": "Choose a channel",
                "DESC": "{installationName} supports live-chat widgets, Facebook Messenger, WhatsApp, Emails, etc., as channels. If you want to build a custom channel, you can create it using the API channel. To get started, choose one of the channels below.",
                "TITLE_NEXT": "Complete the setup",
                "TITLE_FINISH": "Voilà!",
                "CHANNEL": {
                    "WEBSITE": {
                        "TITLE": "Website",
                        "DESCRIPTION": "Create a live-chat widget"
                    },
                    "FACEBOOK": {
                        "TITLE": "Facebook",
                        "DESCRIPTION": "Connect your Facebook page"
                    },
                    "WHATSAPP": {
                        "TITLE": "WhatsApp",
                        "DESCRIPTION": "Support your customers on WhatsApp"
                    },
                    "WHATSAPP_CALL": {
                        "TITLE": "WhatsApp Call",
                        "DESCRIPTION": "Take voice calls on your WhatsApp number"
                    },
                    "EMAIL": {
                        "TITLE": "Email",
                        "DESCRIPTION": "Connect Gmail or Google Workspace with your Google account"
                    },
                    "SMS": {
                        "TITLE": "SMS",
                        "DESCRIPTION": "Integrate SMS channel with Twilio or bandwidth"
                    },
                    "API": {
                        "TITLE": "API",
                        "DESCRIPTION": "Make a custom channel using our API"
                    },
                    "TELEGRAM": {
                        "TITLE": "Telegram",
                        "DESCRIPTION": "Configure Telegram channel using Bot token"
                    },
                    "LINE": {
                        "TITLE": "Line",
                        "DESCRIPTION": "Integrate your Line channel"
                    },
                    "INSTAGRAM": {
                        "TITLE": "Instagram",
                        "DESCRIPTION": "Connect your instagram account"
                    },
                    "TIKTOK": {
                        "TITLE": "TikTok",
                        "DESCRIPTION": "Connect your TikTok account"
                    },
                    "VOICE": {
                        "TITLE": "Voice",
                        "DESCRIPTION": "Integrate with Twilio Voice"
                    },
                    "ZALO": {
                        "TITLE": "Zalo",
                        "DESCRIPTION": "Connect a personal Zalo account by QR code"
                    }
                }
            },
            "AGENTS": {
                "TITLE": "Agents",
                "DESC": "Here you can add agents to manage your newly created inbox. Only these selected agents will have access to your inbox. Agents which are not part of this inbox will not be able to see or respond to messages in this inbox when they login. <br> <b>PS:</b> As an administrator, if you need access to all inboxes, you should add yourself as agent to all inboxes that you create.",
                "VALIDATION_ERROR": "Add at least one agent to your new Inbox",
                "PICK_AGENTS": "Pick agents for the inbox"
            },
            "DETAILS": {
                "TITLE": "Inbox Details",
                "DESC": "From the dropdown below, select the Facebook Page you want to connect to {installationName}. You can also give a custom name to your inbox for better identification."
            },
            "FINISH": {
                "TITLE": "Nailed It!",
                "DESC": "You have successfully finished integrating your Facebook Page with {installationName}. Next time a customer messages your Page, the conversation will automatically appear on your inbox.<br>We are also providing you with a widget script that you can easily add to your website. Once this is live on your website, customers can message you right from your website without the help of any external tool and the conversation will appear right here, on {installationName}.<br>Cool, huh? Well, we sure try to be :)"
            },
            "EMAIL_PROVIDER": {
                "TITLE": "Select your email provider",
                "DESCRIPTION": "Select an email provider from the list below. If you don't see your email provider in the list, you can select the other provider option and provide the IMAP and SMTP Credentials."
            },
            "MICROSOFT": {
                "TITLE": "Microsoft Email",
                "DESCRIPTION": "Click on the Sign in with Microsoft button to get started. You will redirected to the email sign in page. Once you accept the requested permissions, you would be redirected back to the inbox creation step.",
                "EMAIL_PLACEHOLDER": "Enter email address",
                "SIGN_IN": "Sign in with Microsoft",
                "ERROR_MESSAGE": "There was an error connecting to Microsoft, please try again"
            },
            "GOOGLE": {
                "TITLE": "Google Email",
                "DESCRIPTION": "Click on the Sign in with Google button to get started. You will redirected to the email sign in page. Once you accept the requested permissions, you would be redirected back to the inbox creation step.",
                "SIGN_IN": "Sign in with Google",
                "EMAIL_PLACEHOLDER": "Enter email address",
                "ERROR_MESSAGE": "There was an error connecting to Google, please try again"
            }
        },
        "DETAILS": {
            "LOADING_FB": "Authenticating you with Facebook...",
            "ERROR_FB_LOADING": "Error loading Facebook SDK. Please disable any ad-blockers and try again from a different browser.",
            "ERROR_FB_AUTH": "Something went wrong, Please refresh page...",
            "ERROR_FB_UNAUTHORIZED": "You're not authorized to perform this action. ",
            "ERROR_FB_UNAUTHORIZED_HELP": "Please ensure you have access to the Facebook page with full control. You can read more about Facebook roles <a href=\" https://www.facebook.com/help/187316341316631\">here</a>.",
            "ERROR_CHANNEL_CREATION": "We were unable to create the inbox. Please try again.",
            "CREATING_CHANNEL": "Creating your Inbox...",
            "TITLE": "Configure Inbox Details",
            "DESC": ""
        },
        "AGENTS": {
            "BUTTON_TEXT": "Add agents",
            "ADD_AGENTS": "Adding Agents to your Inbox..."
        },
        "FINISH": {
            "TITLE": "Your Inbox is ready!",
            "MESSAGE": "You can now engage with your customers through your new Channel. Happy supporting",
            "BUTTON_TEXT": "Take me there",
            "MORE_SETTINGS": "More settings",
            "WEBSITE_SUCCESS": "You have successfully finished creating a website channel. Copy the code shown below and paste it on your website. Next time a customer use the live chat, the conversation will automatically appear on your inbox.",
            "WHATSAPP_QR_INSTRUCTION": "Scan the QR code above to quickly test your WhatsApp inbox",
            "MESSENGER_QR_INSTRUCTION": "Scan the QR code above to quickly test your Facebook Messenger inbox",
            "TELEGRAM_QR_INSTRUCTION": "Scan the QR code above to quickly test your Telegram inbox"
        },
        "ZALO_SESSION": {
            "LOST": "The Zalo session for this inbox has ended. You will not receive or send messages until you sign in again.",
            "RECONNECT": "Scan QR code again",
            "WAITING": "This inbox is waiting for a Zalo QR code scan.",
            "CONNECT": "Scan QR code",
            "CONNECTED_AS": "Connected as {name}",
            "DISCONNECTED": "This inbox is disconnected from Zalo. Scan a QR code to connect an account again.",
            "ACCOUNT_TITLE": "Connected Zalo account",
            "ACCOUNT_UNKNOWN": "No Zalo account connected yet",
            "CONNECTED_SINCE": "Connected since {time}",
            "DISCONNECT": "Disconnect Zalo",
            "DISCONNECT_CONFIRM": "Disconnect this Zalo account? The inbox stops receiving messages until you scan a QR code again.",
            "DISCONNECT_DONE": "Zalo account disconnected.",
            "DISCONNECT_BRIDGE_DOWN": "Disconnected in Yona, but the Zalo connection did not answer — the session may stay alive on Zalo for a few more minutes.",
            "SWITCH_ACCOUNT": "Connect another account",
            "STATE": {
                "CONNECTED": "Connected",
                "SESSION_LOST": "Session lost",
                "QR_WAITING": "Waiting for QR scan",
                "DISCONNECTED": "Disconnected"
            },
            "BRIDGE": {
                "LABEL": "Zalo connector",
                "OK": "Working",
                "DEGRADED": "Errors reported ({count})",
                "HALF_OPEN": "Retrying",
                "OPEN": "Paused after {count} errors, retrying at {time}"
            },
            "ERRORS": {
                "BRIDGE_UNREACHABLE": "The Zalo connection is temporarily unavailable. Try again in a few minutes, or contact support if it persists.",
                "BRIDGE_REJECTED": "The Zalo connection could not process the request. Try again, or contact support if it persists.",
                "NO_QR_SESSION": "No QR sign-in session is open. Start a new one.",
                "ACCOUNT_MISMATCH": "That QR code belongs to a different Zalo account. This inbox is connected to {name}.",
                "SESSION_CAP_REACHED": "The Zalo server is at capacity ({max} accounts). Please try again in a few minutes.",
                "ACCOUNT_IN_USE": "That Zalo account is already connected to inbox \"{inbox}\". One account can only serve one inbox."
            }
        },
        "REAUTH": "Reauthorize",
        "VIEW": "View",
        "EDIT": {
            "API": {
                "SUCCESS_MESSAGE": "Inbox settings updated successfully",
                "AUTO_ASSIGNMENT_SUCCESS_MESSAGE": "Auto assignment updated successfully",
                "ERROR_MESSAGE": "We couldn't update inbox settings. Please try again later."
            },
            "EMAIL_COLLECT_BOX": {
                "ENABLED": "Enabled",
                "DISABLED": "Disabled"
            },
            "ENABLE_CSAT": {
                "ENABLED": "Enabled",
                "DISABLED": "Disabled"
            },
            "SENDER_NAME_SECTION": {
                "TITLE": "Sender name",
                "SUB_TEXT": "Select the name shown to your customer when they receive emails from your agents.",
                "FOR_EG": "For eg:",
                "FRIENDLY": {
                    "TITLE": "Friendly",
                    "FROM": "from",
                    "SUBTITLE": "Add the name of the agent who sent the reply in the sender name to make it friendly."
                },
                "PROFESSIONAL": {
                    "TITLE": "Professional",
                    "SUBTITLE": "Use only the configured business name as the sender name in the email header."
                },
                "BUSINESS_NAME": {
                    "BUTTON_TEXT": "Configure your business name",
                    "PLACEHOLDER": "Enter your business name",
                    "SAVE_BUTTON_TEXT": "Save"
                }
            },
            "ALLOW_MESSAGES_AFTER_RESOLVED": {
                "ENABLED": "Enabled",
                "DISABLED": "Disabled"
            },
            "ENABLE_CONTINUITY_VIA_EMAIL": {
                "ENABLED": "Enabled",
                "DISABLED": "Disabled"
            },
            "LOCK_TO_SINGLE_CONVERSATION": {
                "ENABLED": "Reopen same conversation",
                "DISABLED": "Create new conversations",
                "ENABLED_DESCRIPTION": "When a contact messages again, the previous conversation will be reopened.",
                "DISABLED_DESCRIPTION": "A new conversation will be created each time after the previous one is resolved."
            },
            "ENABLE_HMAC": {
                "LABEL": "Enable"
            }
        },
        "DELETE": {
            "BUTTON_TEXT": "Delete",
            "AVATAR_DELETE_BUTTON_TEXT": "Delete Avatar",
            "CONFIRM": {
                "TITLE": "Confirm Deletion",
                "MESSAGE": "Are you sure to delete ",
                "PLACE_HOLDER": "Please type {inboxName} to confirm",
                "YES": "Yes, Delete ",
                "NO": "No, Keep "
            },
            "API": {
                "SUCCESS_MESSAGE": "Inbox deleted successfully",
                "ERROR_MESSAGE": "Could not delete inbox. Please try again later.",
                "AVATAR_SUCCESS_MESSAGE": "Inbox avatar deleted successfully",
                "AVATAR_ERROR_MESSAGE": "Could not delete the inbox avatar. Please try again later."
            }
        },
        "TABS": {
            "SETTINGS": "Settings",
            "COLLABORATORS": "Collaborators",
            "CONFIGURATION": "Configuration",
            "CAMPAIGN": "Campaigns",
            "PRE_CHAT_FORM": "Pre Chat Form",
            "BUSINESS_HOURS": "Business Hours",
            "WIDGET_BUILDER": "Widget Builder",
            "BOT_CONFIGURATION": "Bot Configuration",
            "ACCOUNT_HEALTH": "Account Health",
            "CSAT": "CSAT",
            "VOICE": "Voice",
            "CALLS": "Calls"
        },
        "VOICE_CONFIGURATION": {
            "ENABLE_VOICE": {
                "LABEL": "Enable Voice Calling",
                "DESCRIPTION": "Enable voice calling on this inbox. Agents will be able to make and receive phone calls."
            },
            "CREDENTIALS": {
                "DESCRIPTION": "Voice calling requires Twilio API Key credentials. These are used to generate tokens for agent voice connections."
            },
            "INBOUND": {
                "LABEL": "Allow incoming calls",
                "DESCRIPTION": "Let customers call this number. When turned off, incoming calls are declined automatically — agents aren't notified and no conversation is created. Agents can still place outgoing calls."
            }
        },
        "WHATSAPP_CALLING": {
            "ENABLE": {
                "LABEL": "Enable WhatsApp Calling",
                "DESCRIPTION": "Allow agents to receive and place WhatsApp Cloud calls on this inbox. Customers can call this business number directly from WhatsApp."
            },
            "ENABLE_FAILED": "Voice calling couldn't be turned on for this number — it isn't enrolled in the WhatsApp Business Calling API yet. Reach out to Meta or your WhatsApp Business Solution Provider to onboard it, then try again.",
            "PHONE_NUMBER": {
                "LABEL": "Business phone number",
                "HELP_TEXT": "WhatsApp number that customers will call."
            },
            "HOW_IT_WORKS": {
                "LABEL": "How it works",
                "DESCRIPTION": "Calls are placed peer-to-peer between the agent's browser and Meta — no extra credentials are required. Make sure the agent's browser has microphone permission for this site."
            },
            "PERMISSION_REQUEST_BODY": {
                "LABEL": "Call permission request message",
                "HELP_TEXT": "Shown to the contact when they haven't yet consented to receive calls. Leave blank to use the default.",
                "PLACEHOLDER": "We would like to call you regarding your conversation."
            }
        },
        "CHANNEL_PREFERENCES": "Channel Preferences",
        "WIDGET_FEATURES": "Widget features",
        "ACCOUNT_HEALTH": {
            "TITLE": "Manage your WhatsApp account",
            "DESCRIPTION": "Review your WhatsApp phone number health, messaging capacity, and linked Meta business details.",
            "GO_TO_SETTINGS": "Go to Meta Business Manager",
            "NO_DATA": "Health data is not available",
            "ERRORS": {
                "AUTHORIZATION": {
                    "EMBEDDED_TITLE": "WhatsApp connection needs to be refreshed",
                    "EMBEDDED_DESCRIPTION": "Meta could not validate the connection for this inbox. Go to Configuration to reconfigure it using Embedded Signup.",
                    "MANUAL_TITLE": "WhatsApp access token needs attention",
                    "MANUAL_DESCRIPTION": "Meta could not validate the access token for this inbox. Go to Configuration to verify or replace it."
                },
                "GENERIC_TITLE": "WhatsApp health data is unavailable",
                "GENERIC_DESCRIPTION": "Meta could not return the current health details. Review the error below and try again later.",
                "GO_TO_CONFIGURATION": "Go to Configuration"
            },
            "SECTIONS": {
                "BUSINESS_PROFILE": "Business profile",
                "PHONE_NUMBER": "Phone number",
                "HEALTH_AND_CAPACITY": "Health and capacity",
                "BUSINESS_ACCOUNT": "Business account"
            },
            "FIELDS": {
                "PROFILE_DESCRIPTION": {
                    "LABEL": "Description",
                    "TOOLTIP": "Description shown to customers in the WhatsApp business profile"
                },
                "PROFILE_ADDRESS": {
                    "LABEL": "Address",
                    "TOOLTIP": "Business address shown in the WhatsApp business profile"
                },
                "PROFILE_EMAIL": {
                    "LABEL": "Email",
                    "TOOLTIP": "Contact email shown in the WhatsApp business profile"
                },
                "PROFILE_WEBSITES": {
                    "LABEL": "Websites",
                    "TOOLTIP": "Website links shown in the WhatsApp business profile"
                },
                "DISPLAY_PHONE_NUMBER": {
                    "LABEL": "Display phone number",
                    "TOOLTIP": "Phone number displayed to customers"
                },
                "VERIFIED_NAME": {
                    "LABEL": "WhatsApp display name",
                    "TOOLTIP": "Display name associated with this phone number on WhatsApp"
                },
                "PHONE_NUMBER_ID": {
                    "LABEL": "Phone number ID",
                    "TOOLTIP": "Meta identifier for this WhatsApp phone number"
                },
                "COEXISTENCE": {
                    "LABEL": "Coexistence",
                    "TOOLTIP": "This number is connected to both the WhatsApp Business app and Cloud API"
                },
                "DISPLAY_NAME_STATUS": {
                    "LABEL": "Display name status",
                    "TOOLTIP": "Whether Meta has reviewed and approved the WhatsApp display name",
                    "DESCRIPTIONS": {
                        "APPROVED": "The display name is approved and can appear at the top of WhatsApp chats. A name saved by the recipient can appear instead.",
                        "AVAILABLE_WITHOUT_REVIEW": "The display name is saved to your WhatsApp profile, but recipients may see the phone number until Meta reviews and approves it. Meta starts this review after your business reaches a higher messaging limit.",
                        "PENDING_REVIEW": "Meta is reviewing the display name. No action is needed unless Meta requests more information.",
                        "REJECTED": "Meta did not approve the display name. Review the display name guidelines, then update the name or appeal in Meta.",
                        "DECLINED": "Meta did not approve the display name. Review the display name guidelines, then update the name or appeal in Meta.",
                        "EXPIRED": "The phone number's certificate has expired, so this number cannot be registered for API use.",
                        "UNKNOWN": "Meta did not return a display name review status."
                    }
                },
                "LAST_ONBOARDED_TIME": {
                    "LABEL": "Last onboarded",
                    "TOOLTIP": "Most recent time Meta onboarded this phone number"
                },
                "PHONE_NUMBER_STATUS": {
                    "LABEL": "Phone number status",
                    "TOOLTIP": "Current connection status of this phone number on WhatsApp"
                },
                "QUALITY_RATING": {
                    "LABEL": "Quality rating",
                    "TOOLTIP": "Quality rating Meta assigns to this phone number based on recent messaging signals"
                },
                "MESSAGING_LIMIT_TIER": {
                    "LABEL": "Business messaging limit",
                    "TOOLTIP": "Number of unique customers your business can message outside the customer service window in a rolling 24-hour period",
                    "DESCRIPTION": "This limit is shared by all WhatsApp phone numbers in the business portfolio."
                },
                "ACCOUNT_MODE": {
                    "LABEL": "Account mode",
                    "TOOLTIP": "Current operating mode of this WhatsApp phone number"
                },
                "CODE_VERIFICATION_STATUS": {
                    "LABEL": "Code verification",
                    "TOOLTIP": "Verification-code status reported by Meta for this phone number"
                },
                "THROUGHPUT_LEVEL": {
                    "LABEL": "Throughput",
                    "TOOLTIP": "Message throughput level assigned to this phone number"
                },
                "BUSINESS_ACCOUNT_NAME": {
                    "LABEL": "WhatsApp Business Account name",
                    "TOOLTIP": "Name of the WhatsApp Business Account linked to this phone number"
                },
                "BUSINESS_ACCOUNT_ID": {
                    "LABEL": "WhatsApp Business Account ID",
                    "TOOLTIP": "Meta identifier for the linked WhatsApp Business Account"
                },
                "BUSINESS_PORTFOLIO_NAME": {
                    "LABEL": "Business portfolio name",
                    "TOOLTIP": "Name of the Meta business portfolio that owns the WhatsApp Business Account"
                },
                "BUSINESS_PORTFOLIO_ID": {
                    "LABEL": "Business portfolio ID",
                    "TOOLTIP": "Meta identifier for the business portfolio that owns the WhatsApp Business Account"
                }
            },
            "VALUES": {
                "NOT_AVAILABLE": "Not available",
                "TIERS": {
                    "TIER_250": "250 customers per 24h",
                    "TIER_1000": "1K customers per 24h",
                    "TIER_1K": "1K customers per 24h",
                    "TIER_2K": "2K customers per 24h",
                    "TIER_10K": "10K customers per 24h",
                    "TIER_100K": "100K customers per 24h",
                    "TIER_UNLIMITED": "Unlimited customers per 24h",
                    "UNKNOWN": "Rating not available"
                },
                "STATUSES": {
                    "APPROVED": "Approved",
                    "CONNECTED": "Connected",
                    "VERIFIED": "Verified",
                    "STANDARD": "Standard",
                    "ACTIVE": "Active",
                    "EXPIRED": "Expired",
                    "FLAGGED": "Flagged",
                    "RESTRICTED": "Restricted",
                    "BANNED": "Banned",
                    "DISCONNECTED": "Disconnected",
                    "UNKNOWN": "Not available",
                    "PENDING_REVIEW": "Under review",
                    "AVAILABLE_WITHOUT_REVIEW": "Not reviewed yet",
                    "REJECTED": "Not approved",
                    "DECLINED": "Not approved",
                    "NON_EXISTS": "Non exists"
                },
                "MODES": {
                    "SANDBOX": "Sandbox",
                    "LIVE": "Live"
                }
            },
            "BUSINESS_PROFILE": {
                "PREVIEW_LABEL": "WhatsApp business profile"
            },
            "WEBHOOK": {
                "TITLE": "Webhook Configuration",
                "DESCRIPTION": "Webhook URL is required for your WhatsApp Business Account to receive messages from customers",
                "ACTION_REQUIRED": "Webhook not configured",
                "REGISTER_BUTTON": "Register Webhook",
                "REGISTER_SUCCESS": "Webhook registered successfully",
                "REGISTER_ERROR": "Failed to register webhook. Please try again.",
                "CONFIGURED_SUCCESS": "Webhook configured successfully",
                "URL_MISMATCH": "Webhook URL mismatch",
                "CONFIGURED_URL": "Configured URL",
                "EXPECTED_URL": "Expected URL",
                "COPY_URL": "Copy webhook URL",
                "COPY_SUCCESS": "Webhook URL copied to clipboard"
            }
        },
        "SETTINGS": "Settings",
        "FEATURES": {
            "LABEL": "Features",
            "DISPLAY_FILE_PICKER": "Display file picker on the widget",
            "DISPLAY_EMOJI_PICKER": "Display emoji picker on the widget",
            "ALLOW_END_CONVERSATION": "Allow users to end conversation from the widget",
            "USE_INBOX_AVATAR_FOR_BOT": "Use inbox name and avatar for the bot"
        },
        "SETTINGS_POPUP": {
            "MESSENGER_HEADING": "Messenger Script",
            "MESSENGER_SUB_HEAD": "Place this button inside your body tag",
            "EMBED_SCRIPT": {
                "TITLE": "Embed script",
                "DESCRIPTION": "Paste this snippet right before the </body> tag of your website.",
                "CUSTOMIZE_LINK": "Customize the widget appearance",
                "HINT_IN_BUILDER": "Get the embed script in the Configuration tab."
            },
            "ALLOWED_DOMAINS": {
                "TITLE": "Allowed Domains",
                "DESCRIPTION": "Restrict which websites can embed your chat widget. For security, only add domains you own and trust. Add one or more domains separated by commas. Leave blank to allow all domains (not recommended for production).",
                "PLACEHOLDER": "example.com, www.example.com, app.example.com"
            },
            "ALLOW_MOBILE_WEBVIEW": {
                "LABEL": "Enable widget in mobile apps",
                "SUBTITLE": "Check this if you embed the widget in iOS or Android apps. Mobile apps don't send domain information, so they would be blocked by domain restrictions unless this is enabled."
            },
            "IDENTITY_VALIDATION": {
                "TITLE": "Identity Validation",
                "DESCRIPTION": "Verify user authenticity by generating secure tokens. This prevents unauthorized users from impersonating others in your chat.",
                "SECRET_KEY": "Secret Key",
                "REQUIRE_LABEL": "Require identity validation for all conversations",
                "REQUIRE_DESCRIPTION": "When enabled, users must provide a valid identity token to start conversations. Requests without valid tokens will be rejected."
            },
            "INBOX_AGENTS": "Agents",
            "INBOX_AGENTS_SUB_TEXT": "Add or remove agents from this inbox",
            "AGENT_ASSIGNMENT": "Conversation Assignment",
            "AGENT_ASSIGNMENT_SUB_TEXT": "Update conversation assignment settings",
            "ENABLE_EMAIL_COLLECT_BOX": "Enable email collect box",
            "ENABLE_EMAIL_COLLECT_BOX_SUB_TEXT": "Enable or disable email collect box on new conversation",
            "AUTO_ASSIGNMENT": "Enable auto assignment",
            "SENDER_NAME_SECTION": "Enable Agent Name in Email",
            "SENDER_NAME_SECTION_TEXT": "Enable/Disable showing Agent's name in email, if disabled it will show business name",
            "ENABLE_CONTINUITY_VIA_EMAIL": "Enable conversation continuity via email",
            "ENABLE_CONTINUITY_VIA_EMAIL_SUB_TEXT": "Conversations will continue over email if the contact email address is available.",
            "ENABLE_CONTINUITY_VIA_EMAIL_DISABLED_TEXT": "This feature is available on a paid plan. Upgrade to enable conversation continuity via email.",
            "LOCK_TO_SINGLE_CONVERSATION": "Conversation Routing",
            "LOCK_TO_SINGLE_CONVERSATION_SUB_TEXT": "Configure conversation creation for existing contacts",
            "INBOX_UPDATE_TITLE": "Inbox Settings",
            "INBOX_UPDATE_SUB_TEXT": "Update your inbox settings",
            "AUTO_ASSIGNMENT_SUB_TEXT": "Enable or disable the automatic assignment of new conversations to the agents added to this inbox.",
            "HMAC_VERIFICATION": "User Identity Validation",
            "HMAC_DESCRIPTION": "With this key you can generate a secret token that can be used to verify the identity of your users.",
            "HMAC_LINK_TO_DOCS": "You can read more here.",
            "HMAC_MANDATORY_VERIFICATION": "Enforce User Identity Validation",
            "HMAC_MANDATORY_DESCRIPTION": "If enabled, requests that cannot be verified will be rejected.",
            "INBOX_IDENTIFIER": "Inbox Identifier",
            "INBOX_IDENTIFIER_SUB_TEXT": "Use the `inbox_identifier` token shown here to authentication your API clients.",
            "FORWARD_EMAIL_TITLE": "Forward to Email",
            "FORWARD_EMAIL_SUB_TEXT": "Start forwarding your emails to the following email address.",
            "FORWARD_EMAIL_NOT_CONFIGURED": "Forwarding emails to your inbox is currently disabled on this installation. To use this feature, it must be enabled by your administrator. Please get in touch with them to proceed.",
            "ALLOW_MESSAGES_AFTER_RESOLVED": "Allow messages after conversation resolved",
            "ALLOW_MESSAGES_AFTER_RESOLVED_SUB_TEXT": "When off, a resolved conversation shows a button to start a new conversation instead of the message box on the widget.",
            "WHATSAPP_SECTION_SUBHEADER": "This API Key is used for the integration with the WhatsApp APIs.",
            "WHATSAPP_SECTION_UPDATE_SUBHEADER": "Enter the new API key to be used for the integration with the WhatsApp APIs.",
            "WHATSAPP_SECTION_TITLE": "API Key",
            "WHATSAPP_SECTION_UPDATE_TITLE": "Update API Key",
            "WHATSAPP_SECTION_UPDATE_PLACEHOLDER": "Enter the new API Key here",
            "WHATSAPP_SECTION_UPDATE_BUTTON": "Update",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_ADD_TITLE": "Add Business Management Token",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_REPLACE_TITLE": "Replace Business Management Token",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_CONFIGURED": "Business management token configured",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_UPDATE_SUBHEADER": "Provide a token with access to this WhatsApp Business Account when {installationName} cannot retrieve its message templates. {installationName} uses this token only for template synchronization.",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_UPDATE_PLACEHOLDER": "Enter the business management token",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_ADD_BUTTON": "Add",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_REPLACE_BUTTON": "Replace",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_UPDATE_SUCCESS": "WhatsApp business management token updated successfully.",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_UPDATE_ERROR": "Could not update the business management token. Verify its WhatsApp Business Management permission and account access, then try again.",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_GUIDE_LINK": "Learn how to generate a WhatsApp Business Management token",
            "WHATSAPP_EMBEDDED_SIGNUP_TITLE": "WhatsApp Embedded Signup",
            "WHATSAPP_EMBEDDED_SIGNUP_SUBHEADER": "This inbox is connected through WhatsApp embedded signup.",
            "WHATSAPP_EMBEDDED_SIGNUP_DESCRIPTION": "You can reconfigure this inbox to update your WhatsApp Business settings.",
            "WHATSAPP_RECONFIGURE_BUTTON": "Reconfigure",
            "WHATSAPP_MANUAL_TRANSFER_TITLE": "Switch to Manual Setup",
            "WHATSAPP_MANUAL_TRANSFER_SUBHEADER": "This inbox was connected through WhatsApp embedded signup, which is no longer supported. Enter the WhatsApp Cloud API credentials from your own Meta app to switch this inbox to a manual setup. Configure the webhook in your Meta app using the verification token above before switching.",
            "WHATSAPP_MANUAL_TRANSFER_PHONE_NUMBER_ID_LABEL": "Phone Number ID",
            "WHATSAPP_MANUAL_TRANSFER_BUSINESS_ACCOUNT_ID_LABEL": "Business Account ID",
            "WHATSAPP_MANUAL_TRANSFER_API_KEY_LABEL": "API Key",
            "WHATSAPP_MANUAL_TRANSFER_API_KEY_PLACEHOLDER": "Enter a permanent access token from your Meta app",
            "WHATSAPP_MANUAL_TRANSFER_BUTTON": "Switch to Manual Setup",
            "WHATSAPP_MANUAL_TRANSFER_SUCCESS": "Inbox switched to manual setup successfully.",
            "WHATSAPP_MANUAL_TRANSFER_ERROR": "Could not switch to manual setup. Please verify the credentials and try again.",
            "WHATSAPP_CONNECT_TITLE": "Connect to WhatsApp Business",
            "WHATSAPP_CONNECT_SUBHEADER": "Upgrade to WhatsApp embedded signup for easier management.",
            "WHATSAPP_CONNECT_DESCRIPTION": "Connect this inbox to WhatsApp Business for enhanced features and easier management.",
            "WHATSAPP_CONNECT_BUTTON": "Connect",
            "WHATSAPP_CONNECT_SUCCESS": "Successfully connected to WhatsApp Business!",
            "WHATSAPP_CONNECT_ERROR": "Failed to connect to WhatsApp Business. Please try again.",
            "WHATSAPP_RECONFIGURE_SUCCESS": "Successfully reconfigured WhatsApp Business!",
            "WHATSAPP_RECONFIGURE_ERROR": "Failed to reconfigure WhatsApp Business. Please try again.",
            "WHATSAPP_APP_ID_MISSING": "WhatsApp App ID is not configured. Please contact your administrator.",
            "WHATSAPP_CONFIG_ID_MISSING": "WhatsApp Configuration ID is not configured. Please contact your administrator.",
            "WHATSAPP_LOGIN_CANCELLED": "WhatsApp login was cancelled. Please try again.",
            "WHATSAPP_WEBHOOK_TITLE": "Webhook Verification Token",
            "WHATSAPP_WEBHOOK_SUBHEADER": "This token is used to verify the authenticity of the webhook endpoint.",
            "WHATSAPP_TEMPLATES_SYNC_TITLE": "Sync Templates",
            "WHATSAPP_TEMPLATES_SYNC_SUBHEADER": "Manually sync message templates from WhatsApp to update your available templates.",
            "WHATSAPP_TEMPLATES_SYNC_BUTTON": "Sync Templates",
            "WHATSAPP_TEMPLATES_SYNC_SUCCESS": "Templates sync initiated successfully. It may take a couple of minutes to update.",
            "WHATSAPP_MANUAL_MIGRATION": {
                "BANNER": {
                    "TITLE": "Manual setup recommended",
                    "DESCRIPTION": "This inbox connects through the shared Meta app used for embedded signup, which recent Meta restrictions have affected. To avoid similar issues in the future, we recommend reconnecting it with your own Meta app.",
                    "START": "Start manual migration",
                    "GUIDE": "View guide"
                },
                "DIALOG": {
                    "EYEBROW": "WhatsApp manual migration",
                    "TITLE": "Reconnect WhatsApp inbox",
                    "CLOSE": "Close",
                    "ACTION_REQUIRED_TITLE": "Reconnect with your own Meta app",
                    "ACTION_REQUIRED_DESCRIPTION": "Inboxes connected through your own Meta app are not affected by restrictions on the shared embedded signup app. This guided flow updates the WhatsApp API connection without creating a new inbox.",
                    "GUIDE_LINK": "Open the manual setup guide",
                    "PRESERVED_TITLE": "Preserved",
                    "PRESERVED_DESCRIPTION": "Conversations, contacts, collaborators, routing, business hours, and inbox settings.",
                    "UPDATED_TITLE": "Updated",
                    "UPDATED_DESCRIPTION": "WABA ID, phone number ID, access token, and webhook configuration.",
                    "WABA_ID": "WABA ID",
                    "WABA_PLACEHOLDER": "Enter WABA ID",
                    "WABA_HELP": "The WhatsApp Business Account that owns this phone number.",
                    "PHONE_NUMBER_ID": "Phone Number ID",
                    "PHONE_NUMBER_PLACEHOLDER": "Enter Phone Number ID",
                    "PHONE_NUMBER_HELP": "Meta's unique ID for the WhatsApp number connected to this inbox.",
                    "DISPLAY_PHONE_NUMBER": "Display phone number",
                    "DISPLAY_PHONE_NUMBER_PLACEHOLDER": "Enter display phone number",
                    "DISPLAY_PHONE_NUMBER_HELP": "The customer-facing WhatsApp number. This cannot be changed during migration.",
                    "ACCESS_TOKEN": "Permanent access token or system user token",
                    "ACCESS_TOKEN_PLACEHOLDER": "Paste access token",
                    "TOKEN_HELP_PREFIX": "The token must include",
                    "TOKEN_HELP_MIDDLE": "Add",
                    "TOKEN_HELP_SUFFIX": "for template sync and template management.",
                    "MESSAGING_PERMISSION": "whatsapp_business_messaging.",
                    "MANAGEMENT_PERMISSION": "whatsapp_business_management",
                    "REVIEW_TITLE": "Review before reconnecting",
                    "INBOX": "Inbox",
                    "PHONE_NUMBER": "Phone number",
                    "NOT_ENTERED": "Not entered",
                    "VERIFY_NOTICE": "{installationName} will verify these credentials with Meta before applying any changes. If verification fails, the current configuration is left untouched.",
                    "BACK": "Back",
                    "OAUTH_DENIED": "Not connected: you cancelled or the provider refused access. Please try again.",
                    "OAUTH_TOKEN": "The provider did not grant access to the mailbox. Please try again and accept every permission asked.",
                    "OAUTH_MISMATCH": "You signed in to a different mailbox. Reconnect with the email address of this inbox.",
                    "CANCEL": "Cancel",
                    "CONTINUE": "Continue",
                    "REVIEW_MIGRATION": "Review migration",
                    "RECONNECT": "Reconnect WhatsApp inbox"
                },
                "STEPS": {
                    "BEFORE_YOU_START": {
                        "TITLE": "Before you start",
                        "DESCRIPTION": "This reconnects the WhatsApp API details for this inbox. Conversations, collaborators, routing, business hours, CSAT, and bot settings will be preserved."
                    },
                    "BUSINESS_DETAILS": {
                        "TITLE": "Business details",
                        "DESCRIPTION": "Enter the WhatsApp assets from the customer Meta Business account."
                    },
                    "ACCESS_TOKEN": {
                        "TITLE": "Access token",
                        "DESCRIPTION": "Paste a permanent access token or system user token with WhatsApp permissions."
                    },
                    "REVIEW_MIGRATION": {
                        "TITLE": "Review migration",
                        "DESCRIPTION": "Confirm the connection details before reconnecting this inbox. {installationName} will verify the token, WABA, and phone number with Meta before applying changes."
                    }
                }
            },
            "WHATSAPP_CALLING_ENABLED": {
                "LABEL": "Enable voice calling",
                "DESCRIPTION": "Allow agents to start and receive WhatsApp voice calls on this inbox. Available only on embedded-signup WhatsApp Cloud channels with calling permission granted by Meta."
            }
        },
        "HELP_CENTER": {
            "LABEL": "Help Center",
            "PLACEHOLDER": "Select Help Center",
            "SELECT_PLACEHOLDER": "Select Help Center",
            "NONE": "None",
            "REMOVE": "Remove Help Center",
            "SUB_TEXT": "Attach a Help Center with the inbox"
        },
        "AUTO_ASSIGNMENT": {
            "MAX_ASSIGNMENT_LIMIT": "Auto assignment limit",
            "MAX_ASSIGNMENT_LIMIT_RANGE_ERROR": "Please enter a value greater than 0",
            "MAX_ASSIGNMENT_LIMIT_SUB_TEXT": "Limit the maximum number of conversations from this inbox that can be auto assigned to an agent"
        },
        "ASSIGNMENT": {
            "TITLE": "Conversation Assignment",
            "DESCRIPTION": "Automatically assign incoming conversations to available agents based on assignment policies",
            "ENABLE_AUTO_ASSIGNMENT": "Enable automatic conversation assignment",
            "DEFAULT_RULES_TITLE": "Default assignment rules",
            "DEFAULT_RULES_DESCRIPTION": "Using the default assignment behavior for all conversations",
            "DEFAULT_RULE_1": "Earliest created conversations first",
            "DEFAULT_RULE_2": "Round robin distribution",
            "CUSTOMIZE_WITH_POLICY": "Customize with assignment policy",
            "USING_POLICY": "Using custom assignment policy for this inbox",
            "CUSTOMIZE_POLICY": "Customize with assignment policy",
            "DELETE_POLICY": "Delete policy",
            "POLICY_LABEL": "Assignment policy",
            "ASSIGNMENT_ORDER_LABEL": "Assignment Order",
            "ASSIGNMENT_METHOD_LABEL": "Assignment Method",
            "POLICY_STATUS": {
                "ACTIVE": "Active",
                "INACTIVE": "Inactive"
            },
            "PRIORITY": {
                "EARLIEST_CREATED": "Earliest created",
                "LONGEST_WAITING": "Longest waiting"
            },
            "METHOD": {
                "ROUND_ROBIN": "Round robin",
                "BALANCED": "Balanced assignment"
            },
            "UPGRADE_PROMPT": "Custom assignment policies are available on the Business plan",
            "UPGRADE_TO_BUSINESS": "Upgrade to Business",
            "DEFAULT_POLICY_LINKED": "Default policy linked",
            "DEFAULT_POLICY_DESCRIPTION": "Link a custom assignment policy to customize how conversations are assigned to agents in this inbox.",
            "LINK_EXISTING_POLICY": "Link existing policy",
            "CREATE_NEW_POLICY": "Create new policy",
            "NO_POLICIES": "No assignment policies found",
            "VIEW_ALL_POLICIES": "View all policies",
            "CURRENT_BEHAVIOR": "Currently using default assignment behavior:",
            "LINK_SUCCESS": "Assignment policy linked successfully",
            "LINK_ERROR": "Failed to link assignment policy"
        },
        "ASSIGNMENT_POLICY": {
            "DELETE_CONFIRM_TITLE": "Delete assignment policy?",
            "DELETE_CONFIRM_MESSAGE": "Are you sure you want to remove this assignment policy from this inbox? The inbox will revert to default assignment rules.",
            "CANCEL": "Cancel",
            "CONFIRM_DELETE": "Delete",
            "DELETE_SUCCESS": "Assignment policy removed successfully",
            "DELETE_ERROR": "Failed to remove assignment policy"
        },
        "FACEBOOK_REAUTHORIZE": {
            "TITLE": "Reauthorize",
            "SUBTITLE": "Your Facebook connection has expired, please reconnect your Facebook page to continue services",
            "MESSAGE_SUCCESS": "Reconnection successful",
            "MESSAGE_ERROR": "There was an error, please try again"
        },
        "PRE_CHAT_FORM": {
            "DESCRIPTION": "Pre chat forms enable you to capture user information before they start conversation with you.",
            "SET_FIELDS": "Pre chat form fields",
            "SET_FIELDS_HEADER": {
                "FIELDS": "Fields",
                "LABEL": "Label",
                "PLACE_HOLDER": "Placeholder",
                "KEY": "Key",
                "TYPE": "Type",
                "REQUIRED": "Required"
            },
            "ENABLE": {
                "LABEL": "Enable pre chat form",
                "OPTIONS": {
                    "ENABLED": "Yes",
                    "DISABLED": "No"
                }
            },
            "PRE_CHAT_MESSAGE": {
                "LABEL": "Pre chat message",
                "PLACEHOLDER": "This message would be visible to the users along with the form",
                "DEFAULT": "Share your queries or comments here."
            },
            "NO_FIELD_ENABLED_WARNING": "The form is on but no field is enabled, so visitors only see the message box. Turn on at least one field below.",
            "REQUIRE_EMAIL": {
                "LABEL": "Visitors should provide their name and email address before starting the chat"
            }
        },
        "CSAT": {
            "TITLE": "Enable CSAT",
            "SUBTITLE": "When a conversation is resolved, the customer gets a short survey and rates it on 3 levels: {poor}, {okay}, {great}. Results go to the CSAT report so you can track satisfaction over time.",
            "MESSAGE": {
                "LABEL": "Message",
                "PLACEHOLDER": "Please enter a message to show customers with the survey"
            },
            "BUTTON_TEXT": {
                "LABEL": "Button text",
                "PLACEHOLDER": "Please rate us"
            },
            "LANGUAGE": {
                "LABEL": "Language",
                "PLACEHOLDER": "Select template language"
            },
            "MESSAGE_PREVIEW": {
                "LABEL": "Message preview",
                "TOOLTIP": "This may vary slightly when rendered on WhatsApp's platform."
            },
            "TEMPLATE_STATUS": {
                "APPROVED": "Approved by WhatsApp",
                "PENDING": "Pending WhatsApp approval",
                "REJECTED": "Meta rejected the template",
                "DEFAULT": "Needs WhatsApp approval",
                "NOT_FOUND": "The template does not exist in the Meta platform."
            },
            "TEMPLATE_CREATION": {
                "SUCCESS_MESSAGE": "WhatsApp template created successfully and sent for approval",
                "ERROR_MESSAGE": "Failed to create WhatsApp template"
            },
            "TEMPLATE_UPDATE_DIALOG": {
                "TITLE": "Edit survey details",
                "DESCRIPTION": "We will delete the previous template and make a new one which will be sent again for WhatsApp approval",
                "CONFIRM": "Create new template",
                "CANCEL": "Go back"
            },
            "UTILITY_ANALYZER": {
                "ACTION": "Check utility fit",
                "HELPER_NOTE": "Check this message before submission to improve Utility fit. The system creates a dedicated CSAT template with buttons for reporting and submits it as Utility; Meta may still reclassify it as Marketing based on content.",
                "RESULT_LABEL": "Meta category prediction",
                "GUIDANCE_NOTE": "This is a guidance check, not a guarantee of Meta approval.",
                "SUGGESTION_LABEL": "Suggested utility-safe rewrite",
                "APPLY": "Use this rewrite",
                "ERROR_MESSAGE": "Couldn't analyze the message. Please try again.",
                "CLASSIFICATION": {
                    "LIKELY_UTILITY": "Likely Utility",
                    "LIKELY_MARKETING": "Likely Marketing",
                    "UNCLEAR": "Needs clarification"
                }
            },
            "SURVEY_RULE": {
                "LABEL": "Survey rule",
                "DESCRIPTION_PREFIX": "Send the survey if the conversation",
                "DESCRIPTION_SUFFIX": "any of the labels",
                "OPERATOR": {
                    "CONTAINS": "contains",
                    "DOES_NOT_CONTAINS": "does not contain"
                },
                "SELECT_PLACEHOLDER": "select labels"
            },
            "NOTE": "Note: CSAT surveys are sent only once per conversation",
            "WHATSAPP_NOTE": "Note: When you save, the system creates a dedicated CSAT template in WhatsApp (used to capture rating and feedback in reports) and submits it as Utility for approval. Meta may still classify it as Marketing based on content. After approval, surveys are sent only once per conversation as per the survey rule.",
            "API": {
                "SUCCESS_MESSAGE": "CSAT settings updated successfully",
                "ERROR_MESSAGE": "We couldn't update CSAT settings. Please try again later."
            }
        },
        "BUSINESS_HOURS": {
            "TITLE": "Set your availability",
            "SUBTITLE": "Set your availability on your livechat widget",
            "WEEKLY_TITLE": "Set your weekly hours",
            "TIMEZONE_LABEL": "Select timezone",
            "TOGGLE_AVAILABILITY": "Enable business availability for this inbox",
            "UNAVAILABLE_MESSAGE_LABEL": "Unavailable message for visitors",
            "UNAVAILABLE_MESSAGE_PLACEHOLDER": "Write the automatic reply...",
            "TOGGLE_HELP": "Visitors who write outside business hours receive the unavailable message below. The website widget also tells them you are away.",
            "DAY": {
                "DAY": "Day",
                "AVAILABILITY": "Availability",
                "HOURS": "Hours",
                "ENABLE": "Enable availability for this day",
                "UNAVAILABLE": "Unavailable",
                "VALIDATION_ERROR": "Starting time should be before closing time.",
                "CHOOSE": "Choose",
                "FROM": "Opening time on {day}",
                "TO": "Closing time on {day}"
            },
            "ALL_DAY": "All-Day",
            "TOTAL": {
                "HOURS": "{hours}h",
                "HOURS_MINUTES": "{hours}h {minutes}m",
                "MINUTES": "{minutes}m"
            }
        },
        "IMAP": {
            "TITLE": "IMAP",
            "SUBTITLE": "Set your IMAP details",
            "NOTE_TEXT": "To enable SMTP, please configure IMAP.",
            "UPDATE": "Update IMAP settings",
            "TOGGLE_AVAILABILITY": "Enable IMAP configuration for this inbox",
            "TOGGLE_HELP": "Enable IMAP so emails customers send to your mailbox arrive in this inbox.",
            "EDIT": {
                "SUCCESS_MESSAGE": "IMAP settings updated successfully",
                "ERROR_MESSAGE": "Unable to update IMAP settings"
            },
            "ADDRESS": {
                "LABEL": "Address",
                "PLACE_HOLDER": "Address (Eg: imap.gmail.com)"
            },
            "PORT": {
                "LABEL": "Port",
                "PLACE_HOLDER": "Port"
            },
            "LOGIN": {
                "LABEL": "Login",
                "PLACE_HOLDER": "Login"
            },
            "PASSWORD": {
                "LABEL": "Password",
                "PLACE_HOLDER": "Password"
            },
            "ENABLE_SSL": "Enable SSL",
            "AUTH_MECHANISM": "Authentication"
        },
        "MICROSOFT": {
            "TITLE": "Microsoft",
            "SUBTITLE": "Reauthorize your MICROSOFT account"
        },
        "SMTP": {
            "TITLE": "SMTP",
            "SUBTITLE": "Set your SMTP details",
            "UPDATE": "Update SMTP settings",
            "TOGGLE_AVAILABILITY": "Enable SMTP configuration for this inbox",
            "TOGGLE_HELP": "Enable SMTP so replies to customers are sent from your mailbox.",
            "EDIT": {
                "SUCCESS_MESSAGE": "SMTP settings updated successfully",
                "ERROR_MESSAGE": "Unable to update SMTP settings"
            },
            "ADDRESS": {
                "LABEL": "Address",
                "PLACE_HOLDER": "Address (Eg: smtp.gmail.com)"
            },
            "PORT": {
                "LABEL": "Port",
                "PLACE_HOLDER": "Port"
            },
            "LOGIN": {
                "LABEL": "Login",
                "PLACE_HOLDER": "Login"
            },
            "PASSWORD": {
                "LABEL": "Password",
                "PLACE_HOLDER": "Password"
            },
            "DOMAIN": {
                "LABEL": "Domain",
                "PLACE_HOLDER": "Domain"
            },
            "ENCRYPTION": "Encryption",
            "SSL_TLS": "SSL/TLS",
            "START_TLS": "STARTTLS",
            "OPEN_SSL_VERIFY_MODE": "SSL certificate verification mode",
            "AUTH_MECHANISM": "Authentication"
        },
        "NOTE": "Note: ",
        "WIDGET_BUILDER": {
            "OPEN_BUILDER": {
                "LABEL": "Widget chat",
                "HELP_TEXT": "Launcher, colors, home screen, other channels, proactive invites, AI assistant, embed code — all in one place.",
                "BUTTON": "Customize widget"
            }
        },
        "EMAIL_PROVIDERS": {
            "MICROSOFT": {
                "TITLE": "Microsoft",
                "DESCRIPTION": "Connect with Microsoft"
            },
            "GOOGLE": {
                "TITLE": "Google",
                "DESCRIPTION": "Connect with Google"
            },
            "OTHER_PROVIDERS": {
                "TITLE": "Other Providers",
                "DESCRIPTION": "Connect with Other Providers"
            }
        },
        "CHANNELS": {
            "MESSENGER": "Messenger",
            "WEB_WIDGET": "Website",
            "TWITTER_PROFILE": "Twitter",
            "TWILIO_SMS": "Twilio SMS",
            "WHATSAPP": "WhatsApp",
            "SMS": "SMS",
            "EMAIL": "Email",
            "TELEGRAM": "Telegram",
            "LINE": "Line",
            "API": "API Channel",
            "INSTAGRAM": "Instagram",
            "TIKTOK": "TikTok",
            "ZALO": "Zalo",
            "VOICE": "Voice"
        },
        "CONNECTION_CHECK": {
            "SYNC_INTERRUPTED": "Email sync is temporarily interrupted by a connection problem. Yona will retry automatically; you do not need to reconnect your account yet.",
            "AUTH_FAILED": "The {protocol} server {host} rejected the login. Check the username and password.",
            "CONNECTION_FAILED": "Could not connect to the {protocol} server {host}:{port}. Check the server address, port and SSL option.",
            "GMAIL_APP_PASSWORD": "Gmail does not accept your Google account password here: turn on 2-Step Verification, create an App Password at {url} and paste it into the password field.",
            "OUTLOOK_APP_PASSWORD": "Outlook/Microsoft 365 may have turned off password sign-in: use an App Password or connect with your Microsoft account.",
            "BANNER_DEFAULT": "This inbox has lost its connection to the provider. You will not receive new messages until you reconnect.",
            "FIX_SETTINGS": "Fix connection settings",
            "RECONNECT": "Reconnect",
            "BADGE": "Disconnected",
            "TELEGRAM_INVALID_TOKEN": "Telegram did not accept this token. Copy the whole token BotFather sent you again (it looks like 123456789:AA…).",
            "TELEGRAM_UNREACHABLE": "Could not reach Telegram to check the token. Please try again in a few minutes.",
            "LINE_INVALID_TOKEN": "LINE did not accept this channel access token. Issue the token again in the Messaging API tab and paste it again.",
            "LINE_UNREACHABLE": "Could not reach LINE to check the token. Please try again in a few minutes.",
            "LINE_CHANNEL_MISMATCH": "This token belongs to a different LINE channel than the channel ID you entered."
        },
        "CONNECT_GUIDE": {
            "STEP": "Step {n}",
            "CHECKING": "Checking the connection…",
            "REQUIRED": "This field is required",
            "TELEGRAM": {
                "TITLE": "Connect a Telegram bot",
                "DESC": "Two steps, about a minute. Messages sent to the bot land in this inbox.",
                "STEP_1_TITLE": "Create a bot with BotFather",
                "STEP_1_DESC": "Open @BotFather in Telegram, send /newbot, choose a display name and then a username for the bot (it must end in \"bot\").",
                "OPEN_BOTFATHER": "Open BotFather",
                "STEP_2_TITLE": "Paste the bot token",
                "STEP_2_DESC": "BotFather replies with a token like 123456789:AA… Copy it and paste it below. Yona checks the token as soon as you connect.",
                "TOKEN_LABEL": "Bot token",
                "TOKEN_PLACEHOLDER": "123456789:AA…",
                "SUBMIT": "Connect Telegram"
            },
            "LINE": {
                "TITLE": "Connect a LINE Official Account",
                "DESC": "Follow these steps in the LINE Developers Console. You only need to copy two codes.",
                "STEP_1_TITLE": "Open the Messaging API channel",
                "STEP_1_DESC": "Sign in to the LINE Developers Console, pick your Provider and open the Messaging API channel of your LINE Official Account (none yet? Click Create a new channel and choose Messaging API).",
                "OPEN_CONSOLE": "Open LINE Developers Console",
                "STEP_2_TITLE": "Copy the Channel secret",
                "STEP_2_DESC": "In the Basic settings tab, scroll to Channel secret, click Copy and paste it below.",
                "STEP_3_TITLE": "Copy the Channel access token",
                "STEP_3_DESC": "In the Messaging API tab, scroll to the bottom, Channel access token (long-lived): click Issue if there is none, then Copy and paste it below.",
                "STEP_4_TITLE": "Turn on the webhook",
                "STEP_4_DESC": "After connecting, Yona shows a webhook URL. Paste it into Webhook URL in the Messaging API tab, click Verify and turn on Use webhook. Turn off Auto-reply messages in LINE Official Account Manager so customers do not get duplicate automatic replies.",
                "SECRET_LABEL": "Channel secret",
                "TOKEN_LABEL": "Channel access token",
                "SUBMIT": "Connect LINE"
            },
            "EMAIL": {
                "CHOOSE_TITLE": "Which mailbox do you use?",
                "CHOOSE_DESC": "Sign in with Google to connect Gmail or Google Workspace, no password needed. Other providers are coming soon.",
                "GOOGLE": {
                    "TITLE": "Sign in with Google",
                    "DESCRIPTION": "Connect Gmail/Google Workspace with your Google account, no password needed"
                },
                "MICROSOFT": {
                    "TITLE": "Sign in with Microsoft",
                    "DESCRIPTION": "Connect Outlook/Microsoft 365 with your Microsoft account, no password needed"
                },
                "GMAIL": {
                    "TITLE": "Gmail",
                    "DESCRIPTION": "Gmail or Google Workspace, using an App Password"
                },
                "OUTLOOK": {
                    "TITLE": "Outlook",
                    "DESCRIPTION": "Outlook, Hotmail or Microsoft 365, using an App Password"
                },
                "OTHER": {
                    "TITLE": "Other",
                    "DESCRIPTION": "Another provider: enter the IMAP/SMTP servers yourself"
                },
                "FORM_TITLE": "Connect your {provider} mailbox",
                "FORM_DESC_PRESET": "Yona has filled in the {provider} mail servers. Just enter your email address and an App Password.",
                "FORM_DESC_OTHER": "Enter the mail server settings your email provider gives you.",
                "CHANNEL_NAME": "Inbox name",
                "CHANNEL_NAME_PLACEHOLDER": "For example: Customer support",
                "EMAIL": "Email address",
                "EMAIL_PLACEHOLDER": "you@company.com",
                "EMAIL_INVALID": "This email address is not valid",
                "APP_PASSWORD": "App Password",
                "APP_PASSWORD_HELP_GMAIL": "Google does not allow your normal sign-in password here. Turn on 2-Step Verification, create a 16-character App Password and paste it here.",
                "APP_PASSWORD_HELP_OUTLOOK": "Turn on two-step verification for your Microsoft account, create an App Password and paste it here. Work accounts may need an administrator to allow it.",
                "CREATE_APP_PASSWORD": "Create an App Password",
                "USE_MAIL_SERVER": "Receive and send mail through my mail server (IMAP/SMTP)",
                "USE_MAIL_SERVER_HELP": "Untick if you only want to forward mail to Yona.",
                "IMAP_TITLE": "Incoming mail (IMAP)",
                "SMTP_TITLE": "Outgoing mail (SMTP)",
                "HOST": "Server",
                "PORT": "Port",
                "LOGIN": "Username",
                "PASSWORD": "Password",
                "IMAP_SSL": "Use SSL",
                "SMTP_SSL": "Use SSL/TLS (port 465)",
                "SUBMIT": "Connect mailbox",
                "BACK": "Choose another provider"
            }
        }
    },
    "INBOX_REPORTS": {
        "HEADER": "Inbox Overview",
        "DESCRIPTION": "Quickly view your inbox performance with key metrics like conversations, response times, resolution times, and resolved cases—all in one place. Click an inbox name for more details.",
        "LOADING_CHART": "Loading chart data...",
        "NO_ENOUGH_DATA": "We've not received enough data points to generate report, Please try again later.",
        "DOWNLOAD_INBOX_REPORTS": "Download inbox reports",
        "FILTER_DROPDOWN_LABEL": "Select Inbox",
        "ALL_INBOXES": "All Inboxes",
        "SEARCH_INBOX": "Search Inbox",
        "FILTERS": {
            "INPUT_PLACEHOLDER": {
                "INBOXES": "Search inboxes"
            }
        },
        "METRICS": {
            "CONVERSATIONS": {
                "NAME": "Conversations",
                "DESC": "( Total )"
            },
            "INCOMING_MESSAGES": {
                "NAME": "Incoming Messages",
                "DESC": "( Total )"
            },
            "OUTGOING_MESSAGES": {
                "NAME": "Outgoing Messages",
                "DESC": "( Total )"
            },
            "FIRST_RESPONSE_TIME": {
                "NAME": "First Response Time",
                "DESC": "( Avg )",
                "INFO_TEXT": "Total number of conversations used for computation:",
                "TOOLTIP_TEXT": "First Response Time is {metricValue} (based on {conversationCount} conversations)"
            },
            "RESOLUTION_TIME": {
                "NAME": "Resolution Time",
                "DESC": "( Avg )",
                "INFO_TEXT": "Total number of conversations used for computation:",
                "TOOLTIP_TEXT": "Resolution Time is {metricValue} (based on {conversationCount} conversations)"
            },
            "RESOLUTION_COUNT": {
                "NAME": "Resolution Count",
                "DESC": "( Total )"
            }
        },
        "CUSTOM_DATE_RANGE": {
            "CONFIRM": "Apply",
            "PLACEHOLDER": "Select date range"
        }
    },
    "INTEGRATION_APPS": {
        "FETCHING": "Fetching Integrations",
        "NO_HOOK_CONFIGURED": "There are no {integrationId} integrations configured in this account.",
        "HEADER": "Applications",
        "COUNT": "{n} integration | {n} integrations",
        "SEARCH_PLACEHOLDER": "Search...",
        "NO_RESULTS": "No results found matching your search",
        "STATUS": {
            "ENABLED": "Enabled",
            "DISABLED": "Disabled"
        },
        "CONFIGURE": "Configure",
        "ADD_BUTTON": "Add a new hook",
        "DELETE": {
            "TITLE": {
                "INBOX": "Confirm deletion",
                "ACCOUNT": "Disconnect"
            },
            "MESSAGE": {
                "INBOX": "Are you sure to delete?",
                "ACCOUNT": "Are you sure to disconnect?"
            },
            "CONFIRM_BUTTON_TEXT": {
                "INBOX": "Yes, Delete",
                "ACCOUNT": "Yes, Disconnect"
            },
            "CANCEL_BUTTON_TEXT": "Cancel",
            "API": {
                "SUCCESS_MESSAGE": "Hook deleted successfully",
                "ERROR_MESSAGE": "Could not connect to the server. Please try again later."
            }
        },
        "LIST": {
            "FETCHING": "Fetching integration hooks",
            "INBOX": "Inbox",
            "ACTIONS": "Actions",
            "DELETE": {
                "BUTTON_TEXT": "Delete"
            }
        },
        "ADD": {
            "FORM": {
                "INBOX": {
                    "LABEL": "Select Inbox",
                    "PLACEHOLDER": "Select Inbox"
                },
                "SUBMIT": "Create",
                "VALIDATING_OPENAI": "Validating with OpenAI...",
                "CANCEL": "Cancel"
            },
            "API": {
                "SUCCESS_MESSAGE": "Integration hook added successfully",
                "ERROR_MESSAGE": "Could not connect to the server. Please try again later."
            }
        },
        "CONNECT": {
            "BUTTON_TEXT": "Connect"
        },
        "DISCONNECT": {
            "BUTTON_TEXT": "Disconnect"
        },
        "SIDEBAR_DESCRIPTION": {
            "DIALOGFLOW": "Dialogflow is a natural language processing platform for building conversational interfaces. Integrating it with {installationName} lets bots handle queries first and transfer them to agents when needed. It helps qualify leads and reduce agent workload by answering FAQs. To add Dialogflow, create a Service Account in Google Console and share the credentials. Refer to the docs for details"
        },
        "dashboard_apps": {
            "name": "Dashboard Apps",
            "description": "Dashboard Apps allow you to create and embed applications that display user information, orders, or payment history, providing more context to your customer support agents."
        },
        "dyte": {
            "name": "Cloudflare RealtimeKit",
            "short_description": "Start video/voice calls with customers directly from {installationName}.",
            "description": "Cloudflare RealtimeKit lets your agents start video/voice calls with your customers directly from {installationName}.",
            "meeting_name": ":agent_name has started a meeting"
        },
        "slack": {
            "name": "Slack",
            "short_description": "Receive notifications and respond to conversations directly in Slack.",
            "description": "Integrate {installationName} with Slack to keep your team in sync. This integration allows you to receive notifications for new conversations and respond to them directly within Slack's interface."
        },
        "webhooks": {
            "name": "Webhooks",
            "description": "Webhook events provide real-time updates about activities in your {installationName} account. You can subscribe to your preferred events, and {installationName} will send you HTTP callbacks with the updates."
        },
        "dialogflow": {
            "name": "Dialogflow",
            "short_description": "Build chatbots to handle initial queries before transferring to agents.",
            "description": "Build chatbots with Dialogflow and easily integrate them into your inbox. These bots can handle initial queries before transferring them to a customer service agent."
        },
        "google_translate": {
            "name": "Google Translate",
            "short_description": "Automatically translate customer messages for agents.",
            "description": "Integrate Google Translate to help agents easily translate customer messages. This integration automatically detects the language and converts it to the agent's or admin's preferred language."
        },
        "openai": {
            "name": "OpenAI",
            "short_description": "AI-powered reply suggestions, summarization, and message enhancement.",
            "description": "Leverage the power of large language models from OpenAI with the features such as reply suggestions, summarization, message rephrasing, spell-checking, and label classification."
        },
        "linear": {
            "name": "Linear",
            "short_description": "Create and link Linear issues directly from conversations.",
            "description": "Create issues in Linear directly from your conversation window. Alternatively, link existing Linear issues for a more streamlined and efficient issue tracking process."
        },
        "notion": {
            "name": "Notion",
            "short_description": "Integrate databases, documents and pages directly with Captain.",
            "description": "Connect your Notion workspace to enable Captain to access and generate intelligent responses using content from your databases, documents, and pages to provide more contextual customer support."
        },
        "shopify": {
            "name": "Shopify",
            "short_description": "Access order details and customer data from your Shopify store.",
            "description": "Connect your Shopify store to access order details, customer information, and product data directly within your conversations and helps your support team provide faster, more contextual assistance to your customers."
        },
        "leadsquared": {
            "name": "LeadSquared",
            "short_description": "Sync your contacts and conversations with LeadSquared CRM.",
            "description": "Sync your contacts and conversations with LeadSquared CRM. This integration automatically creates leads in LeadSquared when new contacts are added, and logs conversation activity to provide your sales team with complete context."
        }
    },
    "INTEGRATION_SETTINGS": {
        "SHOPIFY": {
            "HEADER": "Shopify",
            "DELETE": {
                "TITLE": "Delete Shopify Integration",
                "MESSAGE": "Are you sure you want to delete the Shopify integration?"
            },
            "STORE_URL": {
                "TITLE": "Connect Shopify Store",
                "LABEL": "Store URL",
                "PLACEHOLDER": "your-store.myshopify.com",
                "HELP": "Enter your Shopify store's myshopify.com URL",
                "CANCEL": "Cancel",
                "SUBMIT": "Connect Store"
            },
            "ERROR": "There was an error connecting to Shopify. Please try again or contact support if the issue persists."
        },
        "HEADER": "Integrations",
        "DESCRIPTION": "{installationName} integrates with multiple tools and services to improve your team's efficiency. Explore the list below to configure your favorite apps.",
        "LEARN_MORE": "Learn more about integrations",
        "LOADING": "Fetching integrations",
        "SEARCH_PLACEHOLDER": "Search integrations...",
        "NO_RESULTS": "No integrations found matching your search",
        "CAPTAIN": {
            "DISABLED": "Captain is not enabled on your account.",
            "CLICK_HERE_TO_CONFIGURE": "Click here to configure",
            "LOADING_CONSOLE": "Loading Captain Console...",
            "FAILED_TO_LOAD_CONSOLE": "Failed to load Captain Console. Please refresh and try again."
        },
        "WEBHOOK": {
            "SUBSCRIBED_EVENTS": "Subscribed Events",
            "LEARN_MORE": "Learn more about webhooks",
            "PAYWALL": {
                "TITLE": "Webhooks are available on paid plans",
                "AVAILABLE_ON": "Use webhooks to receive real-time events from your {installationName} account.",
                "UPGRADE_PROMPT": "Upgrade to the Startups, Business, or Enterprise plan to use webhooks.",
                "UPGRADE_NOW": "Upgrade now",
                "CANCEL_ANYTIME": "Change or cancel your plan anytime."
            },
            "SECRET": {
                "LABEL": "Secret",
                "COPY": "Copy secret to clipboard",
                "COPY_SUCCESS": "Secret copied to clipboard",
                "TOGGLE": "Toggle secret visibility",
                "CREATED_DESC": "Your webhook has been created. Use the secret below to verify webhook signatures. Please copy it now — you can also find it later in the webhook edit form.",
                "DONE": "Done"
            },
            "COUNT": "{n} webhook | {n} webhooks",
            "SEARCH_PLACEHOLDER": "Search webhooks...",
            "NO_RESULTS": "No webhooks found matching your search",
            "FORM": {
                "CANCEL": "Cancel",
                "DESC": "Webhook events provide you the realtime information about what's happening in your {installationName} account. Please enter a valid URL to configure a callback.",
                "SUBSCRIPTIONS": {
                    "LABEL": "Events",
                    "EVENTS": {
                        "CONVERSATION_CREATED": "Conversation Created",
                        "CONVERSATION_STATUS_CHANGED": "Conversation Status Changed",
                        "CONVERSATION_UPDATED": "Conversation Updated",
                        "MESSAGE_CREATED": "Message created",
                        "MESSAGE_UPDATED": "Message updated",
                        "WEBWIDGET_TRIGGERED": "Live chat widget opened by the user",
                        "CONTACT_CREATED": "Contact created",
                        "CONTACT_UPDATED": "Contact updated",
                        "CONVERSATION_TYPING_ON": "Conversation Typing On",
                        "CONVERSATION_TYPING_OFF": "Conversation Typing Off",
                        "INBOX_UPDATED": "Inbox updated"
                    }
                },
                "NAME": {
                    "LABEL": "Webhook Name",
                    "PLACEHOLDER": "Enter the name of the webhook"
                },
                "END_POINT": {
                    "LABEL": "Webhook URL",
                    "PLACEHOLDER": "Example: {webhookExampleURL}",
                    "ERROR": "Please enter a valid URL"
                },
                "EDIT_SUBMIT": "Update webhook",
                "ADD_SUBMIT": "Create webhook"
            },
            "TITLE": "Webhook",
            "CONFIGURE": "Configure",
            "HEADER": "Webhook settings",
            "HEADER_BTN_TXT": "Add new webhook",
            "LOADING": "Fetching attached webhooks",
            "SEARCH_404": "There are no items matching this query",
            "SIDEBAR_TXT": "<p><b>Webhooks</b> </p> <p>Webhooks are HTTP callbacks which can be defined for every account. They are triggered by events like message creation in {installationName}. You can create more than one webhook for this account. <br /><br /> For creating a <b>webhook</b>, click on the <b>Add new webhook</b> button. You can also remove any existing webhook by clicking on the Delete button.</p>",
            "LIST": {
                "404": "There are no webhooks configured for this account.",
                "TITLE": "Manage webhooks",
                "TABLE_HEADER": {
                    "WEBHOOK_ENDPOINT": "Webhook endpoint",
                    "ACTIONS": "Actions"
                }
            },
            "EDIT": {
                "BUTTON_TEXT": "Edit",
                "TITLE": "Edit webhook",
                "API": {
                    "SUCCESS_MESSAGE": "Webhook configuration updated successfully",
                    "ERROR_MESSAGE": "Could not connect to the server. Please try again later."
                }
            },
            "ADD": {
                "CANCEL": "Cancel",
                "TITLE": "Add new webhook",
                "API": {
                    "SUCCESS_MESSAGE": "Webhook configuration added successfully",
                    "ERROR_MESSAGE": "Could not connect to the server. Please try again later."
                }
            },
            "DELETE": {
                "BUTTON_TEXT": "Delete",
                "API": {
                    "SUCCESS_MESSAGE": "Webhook deleted successfully",
                    "ERROR_MESSAGE": "Could not connect to the server. Please try again later."
                },
                "CONFIRM": {
                    "TITLE": "Confirm Deletion",
                    "MESSAGE": "Are you sure to delete the webhook? ({webhookURL})",
                    "YES": "Yes, Delete ",
                    "NO": "No, Keep it"
                }
            }
        },
        "SLACK": {
            "HEADER": "Slack",
            "DELETE": "Delete",
            "DELETE_CONFIRMATION": {
                "TITLE": "Delete the integration",
                "MESSAGE": "Are you sure you want to delete the integration? Doing so will result in the loss of access to conversations on your Slack workspace."
            },
            "HELP_TEXT": {
                "TITLE": "How to use the Slack Integration?",
                "BODY": "With this integration, all of your incoming conversations will be synced to the ***{selectedChannelName}*** channel in your Slack workspace. You can manage all your customer conversations right within the channel and never miss a message.\n\nHere are the main features of the integration:\n\n**Respond to conversations from within Slack:** To respond to a conversation in the ***{selectedChannelName}*** Slack channel, simply type out your message and send it as a thread. This will create a response back to the customer through {installationName}. It's that simple!\n\n **Create private notes:** If you want to create private notes instead of replies, start your message with ***`note:`***. This ensures that your message is kept private and won't be visible to the customer.\n\n**Associate an agent profile:** If the person who replied on Slack has an agent profile in {installationName} under the same email, the replies will be associated with that agent profile automatically. This means you can easily track who said what and when. On the other hand, when the replier doesn't have an associated agent profile, the replies will appear from the bot profile to the customer.",
                "SELECTED": "selected"
            },
            "SELECT_CHANNEL": {
                "OPTION_LABEL": "Select a channel",
                "UPDATE": "Update",
                "BUTTON_TEXT": "Connect channel",
                "DESCRIPTION": "Your Slack workspace is now linked with {installationName}. However, the integration is currently inactive. To activate the integration and connect a channel to {installationName}, please click the button below.\n\n**Note:** If you are attempting to connect a private channel, add the {installationName} app to the Slack channel before proceeding with this step.",
                "ATTENTION_REQUIRED": "Attention required",
                "EXPIRED": "Your Slack integration has expired. To continue receiving messages on Slack, please delete the integration and connect your workspace again."
            },
            "UPDATE_ERROR": "There was an error updating the integration, please try again",
            "UPDATE_SUCCESS": "The channel is connected successfully",
            "FAILED_TO_FETCH_CHANNELS": "There was an error fetching the channels from Slack, please try again"
        },
        "DYTE": {
            "CLICK_HERE_TO_JOIN": "Click here to join",
            "LEAVE_THE_ROOM": "Leave the room",
            "START_VIDEO_CALL_HELP_TEXT": "Start a new video call with the customer",
            "JOIN_ERROR": "There was an error joining the call, please try again",
            "CREATE_ERROR": "There was an error creating a meeting link, please try again"
        },
        "OPEN_AI": {
            "AI_ASSIST": "AI Assist",
            "WITH_AI": " {option} with AI ",
            "OPTIONS": {
                "REPLY_SUGGESTION": "Reply Suggestion",
                "SUMMARIZE": "Summarize",
                "REPHRASE": "Improve Writing",
                "FIX_SPELLING_GRAMMAR": "Fix Spelling and Grammar",
                "SHORTEN": "Shorten",
                "EXPAND": "Expand",
                "MAKE_FRIENDLY": "Change message tone to friendly",
                "MAKE_FORMAL": "Use formal tone",
                "SIMPLIFY": "Simplify",
                "CONFIDENT": "Use confident tone",
                "PROFESSIONAL": "Use professional tone",
                "CASUAL": "Use casual tone",
                "STRAIGHTFORWARD": "Use straightforward tone"
            },
            "REPLY_OPTIONS": {
                "IMPROVE_REPLY": "Improve reply",
                "IMPROVE_REPLY_SELECTION": "Improve the selection",
                "CHANGE_TONE": {
                    "TITLE": "Change tone",
                    "OPTIONS": {
                        "PROFESSIONAL": "Professional",
                        "CASUAL": "Casual",
                        "STRAIGHTFORWARD": "Straightforward",
                        "CONFIDENT": "Confident",
                        "FRIENDLY": "Friendly"
                    }
                },
                "GRAMMAR": "Fix grammar & spelling",
                "SUGGESTION": "Suggest a reply",
                "SUMMARIZE": "Summarize the conversation",
                "ASK_COPILOT": "Ask Copilot"
            },
            "ASSISTANCE_MODAL": {
                "DRAFT_TITLE": "Draft content",
                "GENERATED_TITLE": "Generated content",
                "AI_WRITING": "AI is writing",
                "BUTTONS": {
                    "APPLY": "Use this suggestion",
                    "CANCEL": "Cancel"
                }
            },
            "CTA_MODAL": {
                "TITLE": "Integrate with OpenAI",
                "DESC": "Bring advanced AI features to your dashboard with OpenAI's GPT models. To begin, enter the API key from your OpenAI account.",
                "KEY_PLACEHOLDER": "Enter your OpenAI API key",
                "BUTTONS": {
                    "NEED_HELP": "Need help?",
                    "DISMISS": "Dismiss",
                    "FINISH": "Finish Setup"
                },
                "DISMISS_MESSAGE": "You can setup OpenAI integration later Whenever you want.",
                "SUCCESS_MESSAGE": "OpenAI integration setup successfully"
            },
            "TITLE": "Improve With AI",
            "SUMMARY_TITLE": "Summary with AI",
            "REPLY_TITLE": "Reply suggestion with AI",
            "SUBTITLE": "An improved reply will be generated using AI, based on your current draft.",
            "TONE": {
                "TITLE": "Tone",
                "OPTIONS": {
                    "PROFESSIONAL": "Professional",
                    "FRIENDLY": "Friendly"
                }
            },
            "BUTTONS": {
                "GENERATE": "Generate",
                "GENERATING": "Generating...",
                "CANCEL": "Cancel"
            },
            "GENERATE_ERROR": "There was an error processing the content, please verify your OpenAI API key and try again"
        },
        "DELETE": {
            "BUTTON_TEXT": "Delete",
            "API": {
                "SUCCESS_MESSAGE": "Integration deleted successfully"
            }
        },
        "CONNECT": {
            "BUTTON_TEXT": "Connect"
        },
        "DASHBOARD_APPS": {
            "TITLE": "Dashboard Apps",
            "HEADER_BTN_TXT": "Add a new dashboard app",
            "SIDEBAR_TXT": "<p><b>Dashboard Apps</b></p><p>Dashboard Apps allow organizations to embed an application inside the {installationName} dashboard to provide the context for customer support agents. This feature allows you to create an application independently and embed that inside the dashboard to provide user information, their orders, or their previous payment history.</p><p>When you embed your application using the dashboard in {installationName}, your application will get the context of the conversation and contact as a window event. Implement a listener for the message event on your page to receive the context.</p><p>To add a new dashboard app, click on the button 'Add a new dashboard app'.</p>",
            "DESCRIPTION": "Dashboard Apps allow organizations to embed an application inside the dashboard to provide the context for customer support agents. This feature allows you to create an application independently and embed that to provide user information, their orders, or their previous payment history.",
            "LEARN_MORE": "Learn more about Dashboard Apps",
            "COUNT": "{n} dashboard app | {n} dashboard apps",
            "SEARCH_PLACEHOLDER": "Search dashboard apps...",
            "NO_RESULTS": "No dashboard apps found matching your search",
            "LIST": {
                "404": "There are no dashboard apps configured on this account yet",
                "LOADING": "Fetching dashboard apps...",
                "TABLE_HEADER": {
                    "NAME": "Name",
                    "ENDPOINT": "Endpoint",
                    "ACTIONS": "Actions"
                },
                "EDIT_TOOLTIP": "Edit app",
                "DELETE_TOOLTIP": "Delete app"
            },
            "FORM": {
                "TITLE_LABEL": "Name",
                "TITLE_PLACEHOLDER": "Enter a name for your dashboard app",
                "TITLE_ERROR": "A name for the dashboard app is required",
                "URL_LABEL": "Endpoint",
                "URL_PLACEHOLDER": "Enter the endpoint URL where your app is hosted",
                "URL_ERROR": "A valid URL is required"
            },
            "CREATE": {
                "HEADER": "Add a new dashboard app",
                "FORM_SUBMIT": "Submit",
                "FORM_CANCEL": "Cancel",
                "API_SUCCESS": "Dashboard app configured successfully",
                "API_ERROR": "We couldn't create an app. Please try again later"
            },
            "UPDATE": {
                "HEADER": "Edit dashboard app",
                "FORM_SUBMIT": "Update",
                "FORM_CANCEL": "Cancel",
                "API_SUCCESS": "Dashboard app updated successfully",
                "API_ERROR": "We couldn't update the app. Please try again later"
            },
            "DELETE": {
                "CONFIRM_YES": "Yes, delete it",
                "CONFIRM_NO": "No, keep it",
                "TITLE": "Confirm deletion",
                "MESSAGE": "Are you sure to delete the app - {appName}?",
                "API_SUCCESS": "Dashboard app deleted successfully",
                "API_ERROR": "We couldn't delete the app. Please try again later"
            }
        },
        "LINEAR": {
            "HEADER": "Linear",
            "ADD_OR_LINK_BUTTON": "Create/Link Linear Issue",
            "LOADING": "Fetching linear issues...",
            "LOADING_ERROR": "There was an error fetching the linear issues, please try again",
            "CREATE": "Create",
            "LINK": {
                "SEARCH": "Search issues",
                "SELECT": "Select issue",
                "TITLE": "Link",
                "EMPTY_LIST": "No linear issues found",
                "LOADING": "Loading",
                "ERROR": "There was an error fetching the linear issues, please try again",
                "LINK_SUCCESS": "Issue linked successfully",
                "LINK_ERROR": "There was an error linking the issue, please try again",
                "LINK_TITLE": "Conversation (#{conversationId}) with {name}"
            },
            "ADD_OR_LINK": {
                "TITLE": "Create/link linear issue",
                "DESCRIPTION": "Create Linear issues from conversations, or link existing ones for seamless tracking.",
                "FORM": {
                    "TITLE": {
                        "LABEL": "Title",
                        "PLACEHOLDER": "Enter title",
                        "REQUIRED_ERROR": "Title is required"
                    },
                    "DESCRIPTION": {
                        "LABEL": "Description",
                        "PLACEHOLDER": "Enter description"
                    },
                    "TEAM": {
                        "LABEL": "Team",
                        "PLACEHOLDER": "Select team",
                        "SEARCH": "Search team",
                        "REQUIRED_ERROR": "Team is required"
                    },
                    "ASSIGNEE": {
                        "LABEL": "Assignee",
                        "PLACEHOLDER": "Select assignee",
                        "SEARCH": "Search assignee"
                    },
                    "PRIORITY": {
                        "LABEL": "Priority",
                        "PLACEHOLDER": "Select priority",
                        "SEARCH": "Search priority"
                    },
                    "LABEL": {
                        "LABEL": "Label",
                        "PLACEHOLDER": "Select label",
                        "SEARCH": "Search label"
                    },
                    "STATUS": {
                        "LABEL": "Status",
                        "PLACEHOLDER": "Select status",
                        "SEARCH": "Search status"
                    },
                    "PROJECT": {
                        "LABEL": "Project",
                        "PLACEHOLDER": "Select project",
                        "SEARCH": "Search project"
                    }
                },
                "CREATE": "Create",
                "CANCEL": "Cancel",
                "CREATE_SUCCESS": "Issue created successfully",
                "CREATE_ERROR": "There was an error creating the issue, please try again",
                "LOADING_TEAM_ERROR": "There was an error fetching the teams, please try again",
                "LOADING_TEAM_ENTITIES_ERROR": "There was an error fetching the team entities, please try again"
            },
            "ISSUE": {
                "STATUS": "Status",
                "PRIORITY": "Priority",
                "ASSIGNEE": "Assignee",
                "LABELS": "Labels",
                "CREATED_AT": "Created at {createdAt}"
            },
            "UNLINK": {
                "TITLE": "Unlink",
                "SUCCESS": "Issue unlinked successfully",
                "ERROR": "There was an error unlinking the issue, please try again"
            },
            "NO_LINKED_ISSUES": "No linked issues found",
            "DELETE": {
                "TITLE": "Are you sure you want to delete the integration?",
                "MESSAGE": "Are you sure you want to delete the integration?",
                "CONFIRM": "Yes, delete",
                "CANCEL": "Cancel"
            },
            "CTA": {
                "TITLE": "Connect to Linear",
                "AGENT_DESCRIPTION": "Linear workspace is not connected. Request your administrator to connect a workspace to use this integration.",
                "DESCRIPTION": "Linear workspace is not connected. Click the button below to connect your workspace to use this integration.",
                "BUTTON_TEXT": "Connect Linear workspace"
            }
        },
        "NOTION": {
            "HEADER": "Notion",
            "DELETE": {
                "TITLE": "Are you sure you want to delete the Notion integration?",
                "MESSAGE": "Deleting this integration will remove access to your Notion workspace and stop all related functionality.",
                "CONFIRM": "Yes, delete",
                "CANCEL": "Cancel"
            }
        }
    },
    "INVITE_LINKS": {
        "API": {
            "ERROR_MESSAGE": "Could not reach the server. Please try again later."
        },
        "PAGE": {
            "TITLE": "Invitation to join {account}",
            "ROLE_BADGE": "Role: {role}",
            "JOIN": {
                "BUTTON": "Join now",
                "LOGGED_IN_AS": "You are signed in as {email}."
            },
            "SIGNUP": {
                "TITLE": "Create an account to join {account}",
                "NAME": {
                    "LABEL": "Your name",
                    "PLACEHOLDER": "Enter your display name"
                },
                "EMAIL": {
                    "LABEL": "Email",
                    "PLACEHOLDER": "Enter your email address",
                    "ERROR": "Please enter a valid email address."
                },
                "PASSWORD": {
                    "LABEL": "Password",
                    "PLACEHOLDER": "Set a login password"
                },
                "SUBMIT": "Create account and join"
            },
            "LOGIN_LINK": "Already have an account? Sign in first, then open this link again to join.",
            "BACK_HOME": "Back to homepage",
            "ERRORS": {
                "NOT_FOUND": {
                    "TITLE": "Invite not found",
                    "DESC": "This invite link does not exist. Ask the account admin to send a new one."
                },
                "REVOKED": {
                    "TITLE": "Invite revoked",
                    "DESC": "The account admin has revoked this link. Ask for a new one."
                },
                "EXPIRED": {
                    "TITLE": "Invite expired",
                    "DESC": "This invite link has expired. Ask the account admin to send a new one."
                },
                "EXHAUSTED": {
                    "TITLE": "Invite fully used",
                    "DESC": "This invite link has reached its usage limit. Ask for a new one."
                }
            }
        },
        "MANAGE": {
            "BUTTON": "Invite via link",
            "TITLE": "Invite via link",
            "DESC": "Create a link to send by hand over Zalo. The recipient creates an account, or joins with one click if they already have one.",
            "CLOSE": "Close",
            "FORM": {
                "ROLE": {
                    "LABEL": "Role"
                },
                "EXPIRES": {
                    "LABEL": "Expires in",
                    "OPTIONS": {
                        "DAY_1": "1 day",
                        "DAY_7": "7 days",
                        "DAY_30": "30 days"
                    }
                },
                "MAX_USES": {
                    "LABEL": "Limit number of uses",
                    "PLACEHOLDER": "Leave blank for unlimited until it expires"
                },
                "SUBMIT": "Create link"
            },
            "CREATED": {
                "TITLE": "Invite link created",
                "HINT": "This link only shows in full once. Copy or send it now.",
                "COPY": "Copy",
                "COPIED": "Copied",
                "SHARE": "Share"
            },
            "LIST": {
                "EMPTY": "No invite links yet.",
                "ROLE_LABEL": "{role} role",
                "STATUS": {
                    "ACTIVE": "Active",
                    "REVOKED": "Revoked",
                    "EXPIRED": "Expired",
                    "EXHAUSTED": "Fully used"
                },
                "USES_UNLIMITED": "{used} uses so far (unlimited)",
                "USES_LIMITED": "{used}/{max} uses",
                "EXPIRES_AT": "Expires {date}",
                "CREATED_BY": "Created by {name}",
                "REVOKE": {
                    "BUTTON": "Revoke",
                    "CONFIRM": {
                        "TITLE": "Revoke invite link",
                        "MESSAGE": "This link will no longer work to join. Are you sure you want to revoke it?",
                        "YES": "Revoke",
                        "NO": "No, keep it"
                    }
                }
            },
            "API": {
                "CREATE_SUCCESS": "Invite link created",
                "REVOKE_SUCCESS": "Invite link revoked"
            }
        }
    },
    "KEYBOARD_SHORTCUTS": {
        "TITLE": "Keyboard shortcuts",
        "SUBTITLE": "Get around faster without the mouse.",
        "GROUPS": {
            "GENERAL": "General",
            "NAVIGATION": "Navigation",
            "COMPOSER": "Composer"
        },
        "ACTIONS": {
            "COMMAND_BAR": "Find and open any feature",
            "SHOW_SHORTCUTS": "Show shortcuts",
            "CLOSE": "Close the open window",
            "GO_TO_INBOX": "Open Inbox",
            "GO_TO_FRIENDS": "Open Friends",
            "GO_TO_SETTINGS": "Open Settings",
            "SEND_MESSAGE": "Send message",
            "NEW_LINE": "New line",
            "NAVIGATE_LIST": "Move through suggestions"
        }
    },
    "LABEL": {
        "TAG_BUTTON": "tag"
    },
    "LABEL_MGMT": {
        "HEADER": "Labels",
        "HEADER_BTN_TXT": "Add label",
        "LOADING": "Fetching labels",
        "DESCRIPTION": "Labels help you categorize and prioritize conversations and leads. You can assign a label to a conversation or contact using the side panel.",
        "LEARN_MORE": "Learn more about labels",
        "COUNT": "{n} label | {n} labels",
        "SEARCH_PLACEHOLDER": "Search labels...",
        "NO_RESULTS": "No labels found matching your search",
        "SEARCH_404": "There are no items matching this query",
        "LIST": {
            "404": "There are no labels available in this account.",
            "TITLE": "Manage labels",
            "DESC": "Labels let you group the conversations together.",
            "TABLE_HEADER": {
                "NAME": "Name",
                "DESCRIPTION": "Description",
                "COLOR": "Color",
                "ACTION": "Actions"
            }
        },
        "FORM": {
            "NAME": {
                "LABEL": "Label Name",
                "PLACEHOLDER": "Label name",
                "REQUIRED_ERROR": "Label name is required",
                "MINIMUM_LENGTH_ERROR": "Minimum length 2 is required",
                "VALID_ERROR": "Label name must be a single line"
            },
            "DESCRIPTION": {
                "LABEL": "Description",
                "PLACEHOLDER": "Label Description"
            },
            "COLOR": {
                "LABEL": "Color"
            },
            "SHOW_ON_SIDEBAR": {
                "LABEL": "Show label on sidebar"
            },
            "EDIT": "Edit",
            "CREATE": "Create",
            "DELETE": "Delete",
            "CANCEL": "Cancel"
        },
        "ADD": {
            "TITLE": "Add label",
            "DESC": "Labels let you group the conversations together.",
            "API": {
                "SUCCESS_MESSAGE": "Label added successfully",
                "ERROR_MESSAGE": "There was an error, please try again"
            }
        },
        "EDIT": {
            "TITLE": "Edit label",
            "API": {
                "SUCCESS_MESSAGE": "Label updated successfully",
                "ERROR_MESSAGE": "There was an error, please try again"
            }
        },
        "DELETE": {
            "BUTTON_TEXT": "Delete",
            "API": {
                "SUCCESS_MESSAGE": "Label deleted successfully",
                "ERROR_MESSAGE": "There was an error, please try again"
            },
            "CONFIRM": {
                "TITLE": "Confirm Deletion",
                "MESSAGE": "Are you sure to delete ",
                "YES": "Yes, Delete ",
                "NO": "No, Keep "
            }
        }
    },
    "LABEL_REPORTS": {
        "HEADER": "Labels Overview",
        "DESCRIPTION": "Track label performance with key metrics including conversations, response times, resolution times, and resolved cases. Click a label name for detailed insights.",
        "LOADING_CHART": "Loading chart data...",
        "NO_ENOUGH_DATA": "We've not received enough data points to generate report, Please try again later.",
        "DOWNLOAD_LABEL_REPORTS": "Download label reports",
        "FILTER_DROPDOWN_LABEL": "Select Label",
        "FILTERS": {
            "INPUT_PLACEHOLDER": {
                "LABELS": "Search labels"
            }
        },
        "METRICS": {
            "CONVERSATIONS": {
                "NAME": "Conversations",
                "DESC": "( Total )"
            },
            "INCOMING_MESSAGES": {
                "NAME": "Incoming Messages",
                "DESC": "( Total )"
            },
            "OUTGOING_MESSAGES": {
                "NAME": "Outgoing Messages",
                "DESC": "( Total )"
            },
            "FIRST_RESPONSE_TIME": {
                "NAME": "First Response Time",
                "DESC": "( Avg )",
                "INFO_TEXT": "Total number of conversations used for computation:",
                "TOOLTIP_TEXT": "First Response Time is {metricValue} (based on {conversationCount} conversations)"
            },
            "RESOLUTION_TIME": {
                "NAME": "Resolution Time",
                "DESC": "( Avg )",
                "INFO_TEXT": "Total number of conversations used for computation:",
                "TOOLTIP_TEXT": "Resolution Time is {metricValue} (based on {conversationCount} conversations)"
            },
            "RESOLUTION_COUNT": {
                "NAME": "Resolution Count",
                "DESC": "( Total )"
            }
        },
        "CUSTOM_DATE_RANGE": {
            "CONFIRM": "Apply",
            "PLACEHOLDER": "Select date range"
        }
    },
    "LANDING": {
        "meta": {
            "title": "Yona · One personal inbox for Zalo, email and friends",
            "description": "Bring your personal Zalo messages, Gmail and chats with friends on Yona into one inbox of your own. Find people by @username, open it in your browser, install it on your phone."
        },
        "nav": {
            "back_to_home": "Back to home"
        },
        "demo": {
            "meta": {
                "title": "Yona · One personal inbox for Zalo, email and friends",
                "description": "Sign up with email or Google and get your own inbox right away: connect personal Zalo and Gmail, and message friends by @username."
            },
            "form": {
                "phone_invalid": "That phone number is not valid. Use 0912345678 or +84912345678."
            },
            "thanks": {
                "meta": {
                    "title": "Yona · One personal inbox for Zalo, email and friends",
                    "description": "Bring your personal Zalo messages, Gmail and chats with friends on Yona into one inbox of your own."
                }
            }
        },
        "zalo_page": {
            "meta": {
                "title": "Read and reply to personal Zalo in your Yona inbox",
                "description": "Scan a QR code to bring your personal Zalo messages into your Yona inbox, next to Gmail and chats with friends. The connection is unofficial, so Zalo may restrict the account."
            },
            "hero": {
                "eyebrow": "Personal Zalo"
            }
        }
    },
    "LEGAL": {
        "nav": {
            "heading": "Legal",
            "terms": "Terms of use",
            "privacy": "Privacy policy"
        },
        "eyebrow": "Legal",
        "updated": "Last updated: :date",
        "related": "Read alongside",
        "terms": {
            "meta": {
                "title": "Terms of use · Yona",
                "description": "The terms for using Yona: what the service covers before paid plans exist, the risks of the personal Zalo channel, your data and what the Yona team can access."
            },
            "title": "Terms of use",
            "updated_on": "24 September 2026",
            "lead": "These terms apply when you create an account and use Yona. We keep them short and state the current limits plainly, so you can decide with the full picture.",
            "sections": {
                "service": {
                    "heading": "1. What Yona is",
                    "body": {
                        "what": "Yona is web software. It brings customer messages from several chat channels into one inbox shared by the whole team, and keeps each sender as a contact record.",
                        "channels": "The channels you can use are the ones you can select when creating a new inbox, such as personal Zalo, the website chat and email. A channel that cannot be selected yet, or is still marked \"Coming soon\", is not available and is not promised by these terms."
                    }
                },
                "account": {
                    "heading": "2. Accounts and members",
                    "points": {
                        "owner": "The person who creates the account is its administrator and can invite members, assign roles and connect channels.",
                        "password": "You keep your password safe and are responsible for actions taken under your account. We recommend turning on two-factor authentication in your Profile.",
                        "members": "Administrators are responsible for the people they invite into the account."
                    }
                },
                "free_phase": {
                    "heading": "3. Before paid plans",
                    "body": {
                        "now": "Yona is still being finished. There is no paid plan yet: no limit on conversations, channels or members, and no card required."
                    },
                    "points": {
                        "no_payment": "Yona has no payment feature yet, so it stores no card or bank details of yours.",
                        "notice": "When paid plans arrive, we will tell the administrator of every account in advance.",
                        "changes": "During this period features may change, and the service may be briefly unavailable while we update it."
                    }
                },
                "zalo": {
                    "heading": "4. The personal Zalo channel and its risks",
                    "body": {
                        "how": "Zalo has no official API for personal accounts. Yona connects by signing in to your Zalo account through a QR code, using an unofficial open source library (zca-js)."
                    },
                    "points": {
                        "unofficial": "Zalo can change how it works at any time. When it does, the connection stops until Yona catches up.",
                        "ban": "A Zalo account can be restricted or locked. This risk is real, and neither you nor Yona can remove it.",
                        "tos": "Using an unofficial tool may go against Zalo's own terms of use. You decide whether to connect an account at all.",
                        "session": "The Zalo sign-in session is stored on Yona's server to keep the connection alive. How it is stored is explained in the Privacy policy.",
                        "keep": "Messages already in Yona stay in the inbox and the customer record, even after the connection stops.",
                        "oa": "If you need an official channel that stays stable long term, Zalo OA is the right route. Yona does not connect to Zalo OA yet."
                    }
                },
                "acceptable_use": {
                    "heading": "5. Acceptable use",
                    "body": {
                        "intro": "You use Yona to talk with your own customers. You must not:"
                    },
                    "points": {
                        "spam": "send spam or advertising to people who have not agreed to receive it, or use Yona against Vietnamese law on advertising and spam messages;",
                        "personal_data": "collect or use your customers' personal data against Vietnamese law on personal data protection;",
                        "unlawful": "spread unlawful content, scams or malware through messages and attachments;",
                        "abuse": "try to reach another account's data, or overload the system."
                    },
                    "note": "You must also follow the terms of every platform you connect, such as Zalo or your email provider."
                },
                "data": {
                    "heading": "6. Your data",
                    "points": {
                        "ownership": "The messages, contact records and files you bring into Yona are yours. Yona processes them to run the service for you, as described in the Privacy policy.",
                        "export": "You can export your contact list and reports to CSV inside the app at any time.",
                        "not_yet": "There is no self-service export of all conversations and no self-service account deletion yet. If you need either, message us as described under Contact."
                    }
                },
                "yona_access": {
                    "heading": "7. What the Yona team can access",
                    "body": {
                        "what": "The Yona operations team has a system administrator account. It can list accounts and users, and it can sign in as a user to help or to fix a problem. When it does, the Yona team member sees exactly what that user sees, conversations included.",
                        "when": "We only use this when we need to help you or fix a problem."
                    }
                },
                "termination": {
                    "heading": "8. Suspension and ending",
                    "points": {
                        "by_you": "You can stop using Yona at any time: disconnect channels, delete inboxes and contacts inside the app, and message us if you want the whole account deleted.",
                        "by_yona": "Yona may suspend an account used against section 5, and will tell that account's administrator."
                    }
                },
                "liability": {
                    "heading": "9. Limitation of liability",
                    "points": {
                        "as_is": "While it is being finished, Yona is provided as is. We work to keep the service stable but do not commit to an uptime level yet.",
                        "platforms": "Yona is not responsible when Zalo or another third-party platform restricts or locks your account, or changes how it works.",
                        "law": "These terms are read and applied under Vietnamese law."
                    }
                },
                "changes": {
                    "heading": "10. Changes to these terms",
                    "body": {
                        "how": "When the terms change, we update the date at the top of this page. Changes that affect your rights are announced in advance to account administrators."
                    }
                },
                "contact": {
                    "heading": "11. Contact",
                    "body": {
                        "how": "Message us through the chat in the bottom corner of any yona.vn page, or leave your phone number on the Book a demo page. Both go straight into the Yona team's inbox."
                    }
                }
            }
        },
        "privacy": {
            "meta": {
                "title": "Privacy policy · Yona",
                "description": "What Yona stores, why, who can see it, which third parties take part and what rights you have over your data."
            },
            "title": "Privacy policy",
            "updated_on": "11 October 2026",
            "lead": "This policy explains what Yona stores, what it is used for, who can see it and what rights you have. Everything here describes how the software works today, including where it still falls short.",
            "sections": {
                "roles": {
                    "heading": "1. Yona's two roles",
                    "points": {
                        "account": "For your account data and your team members' data, such as names, emails and passwords, Yona decides how it is processed and is directly responsible.",
                        "customers": "For the customer data you bring into Yona, such as messages, contact records and attachments, your business decides the purpose. Yona processes it on your behalf, only to run the service."
                    },
                    "note": "If you are a customer of a business that uses Yona, contact that business first. We help them answer your request."
                },
                "collected": {
                    "heading": "2. What Yona stores",
                    "points": {
                        "account": "Accounts and members: name, email, avatar, language, password (stored only as a hash that cannot be reversed), and the two-factor secret if you turn it on (stored encrypted).",
                        "sessions": "Sign-in sessions: the IP address and browser of each session, so you can review and sign out sessions remotely from your Profile.",
                        "conversations": "Conversations: the content of messages in both directions, attachments such as images, videos, voice notes and documents, plus private notes, labels and assignees.",
                        "contacts": "Contact records: name, phone number, email, avatar, custom attributes and notes entered by your team or sent in by a channel.",
                        "widget": "Visitors using the website chat: browser type and language, and the page they were on when the chat started.",
                        "channels": "Channel connection details: the personal Zalo sign-in session (see section 5), the mailbox password of an email channel, the Google tokens of a Gmail inbox (see section 6) and access tokens of other channels. Email passwords and access tokens are stored encrypted, except the API keys of WhatsApp and SMS channels, which are not encrypted yet.",
                        "public": "Yona's public pages: the name, phone number and note you send on the Book a demo page, and messages you send through the chat on yona.vn."
                    }
                },
                "purposes": {
                    "heading": "3. What Yona uses data for",
                    "points": {
                        "messaging": "Receiving and sending messages on the channels you connect, and showing the inbox and customer records to your team.",
                        "security": "Signing in and keeping accounts safe.",
                        "email": "Sending system email: sign-up confirmation, password reset and the notifications you turned on.",
                        "support": "Helping you when you ask, and fixing problems.",
                        "demo": "Calling you back when you book a demo.",
                        "analytics": "Counting page views in aggregate with Plausible, an analytics tool that uses no cookies."
                    }
                },
                "access": {
                    "heading": "4. Who can see the data",
                    "points": {
                        "members": "Members of your account, according to their role and the inboxes they are assigned to.",
                        "isolation": "Each business's data is kept apart by account. Members of one account cannot see another account's data.",
                        "yona": "The Yona operations team: it has system administrator rights and can sign in as a user to help or fix a problem. It then sees exactly what that user sees.",
                        "files": "Attachments open through links that contain a random string, without signing in. Anyone holding a link can open the file, so do not share file links outside your team."
                    }
                },
                "zalo_session": {
                    "heading": "5. The personal Zalo sign-in session",
                    "points": {
                        "stored": "When you scan the QR code, Yona stores the Zalo session (its cookies) as a file on the server to keep the connection alive. Whoever holds this file can use that Zalo account.",
                        "protection": "Only Yona's Zalo service process can read the file (mode 0600 inside a 0700 directory). The file is not yet encrypted on disk.",
                        "removal": "When you disconnect Zalo in the inbox settings, the session file is deleted.",
                        "transport": "Zalo messages travel through the unofficial open source library zca-js to Zalo's servers."
                    }
                },
                "google_data": {
                    "heading": "6. Data from your Google account (Gmail)",
                    "body": {
                        "intro": "When you choose Sign in with Google to connect a Gmail or Google Workspace mailbox, Yona asks for access to Gmail (scope https://mail.google.com/) and the email address of that account. This section explains what Yona does with Google data."
                    },
                    "points": {
                        "accessed": "Data Yona accesses: the messages in your inbox (sender, recipients, subject, body, attachments) and the email address of the Google account you connect. Yona reads mail over Gmail IMAP and sends mail over Gmail SMTP with the access token Google issues.",
                        "use": "Sole purpose: bringing your customers' emails into your team's shared inbox on Yona, and sending the replies or new emails your team writes from your own address. Yona does not delete or move messages in Gmail; when Yona downloads a message, Gmail marks it as read.",
                        "notifications": "To show new mail almost instantly, Yona subscribes to Gmail \"new mail\" notifications through Google Cloud Pub/Sub. A notification only carries the email address and a sequence number, never message content.",
                        "storage": "Google access and refresh tokens are stored encrypted. Synced messages are stored on Yona's servers like every other conversation (section 2).",
                        "sharing": "Yona does not sell Gmail data, does not use it for advertising and does not transfer it to third parties, except when you turn on a tool that receives conversation data yourself (webhooks, agent bots, integrations in section 7), when needed to run a feature you use, or when the law requires it.",
                        "ai": "Yona does not use Gmail data to train or improve generalized artificial intelligence or machine learning models.",
                        "people": "The Yona operations team does not read your Gmail messages, except when you ask for help with a specific issue, when needed to investigate security incidents or abuse, or when the law requires it.",
                        "disconnect": "Disconnecting: deleting the Gmail inbox in Inbox settings makes Yona delete the tokens, stop Gmail notifications and delete that inbox's conversations along with their attachments. You can also revoke Yona's access at any time at https://myaccount.google.com/permissions.",
                        "limited_use": "Yona's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy (https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements."
                    }
                },
                "third_parties": {
                    "heading": "7. Third parties that take part",
                    "points": {
                        "zalo": "Zalo: receives and sends messages for the personal Zalo channel.",
                        "other_channels": "Other messaging platforms you connect, such as Telegram, LINE, WhatsApp or an SMS provider: receive and send messages for that channel.",
                        "cloudflare": "Cloudflare: all traffic to yona.vn passes through Cloudflare's network. Cloudflare servers may be located outside Vietnam.",
                        "mail": "An email delivery provider: carries system email to your mailbox.",
                        "your_mailbox": "Your own mail server: when you connect an email channel, Yona reads and sends mail over IMAP/SMTP with the account you provide.",
                        "google": "Google: a Gmail inbox connected with Sign in with Google is read and sent through Gmail servers, and new-mail notifications go through Google Cloud Pub/Sub (see section 6).",
                        "plausible": "Plausible: counts page views, without cookies.",
                        "push": "Your browser's push service: only if you turn on push notifications, the notification content passes through the push service of the browser you use.",
                        "your_tools": "Tools you connect yourself: webhooks, agent bots and the integrations you enable receive conversation data exactly as you configure them. You are responsible for those destinations."
                    }
                },
                "retention": {
                    "heading": "8. Keeping and deleting data",
                    "points": {
                        "kept": "Messages, contact records and files are kept until you delete them or ask for your account to be deleted. Yona does not yet delete conversations automatically after a set period.",
                        "notifications": "In-app notifications older than one month are cleaned up automatically.",
                        "self_service": "You can delete contacts, messages and inboxes yourself inside the app.",
                        "account": "There is no self-service account deletion yet. Message us as described under Contact, and the operations team will delete the account and its data from the system administration page."
                    }
                },
                "security": {
                    "heading": "9. Security",
                    "points": {
                        "https": "Connections to Yona use HTTPS.",
                        "passwords": "Passwords are stored as hashes. You can turn on two-factor authentication.",
                        "secrets": "Email mailbox passwords, Google tokens and channel access tokens are stored encrypted, except the API keys of WhatsApp and SMS channels (not encrypted yet).",
                        "zalo": "The Zalo session is stored as an unencrypted file, protected only by read permissions (see section 5).",
                        "incident": "No system is perfectly secure. If we find an incident that exposes data, we tell the administrators of the affected accounts."
                    }
                },
                "rights": {
                    "heading": "10. Your rights",
                    "body": {
                        "intro": "Under Vietnamese law on personal data protection, you have the right to:"
                    },
                    "points": {
                        "know": "know what data is processed and why, which is what this page is for;",
                        "access": "view and correct your own details in your Profile;",
                        "portability": "take your data out: export the contact list to CSV inside the app, and request anything else through Contact;",
                        "delete": "ask for data to be deleted, or for processing to be restricted or stopped;",
                        "withdraw": "withdraw consent by stopping use and asking for your account to be deleted;",
                        "complain": "complain to us or to the competent state authority."
                    },
                    "note": "We answer through the same channel you used to reach us."
                },
                "cookies": {
                    "heading": "11. Cookies",
                    "points": {
                        "session": "Session and request-forgery protection cookies: required to sign in.",
                        "locale": "Language cookie: remembers the language you chose.",
                        "widget": "The chat on yona.vn keeps a conversation token in your browser, so you see earlier messages when you come back.",
                        "no_ads": "Yona uses no advertising or tracking cookies."
                    }
                },
                "changes": {
                    "heading": "12. Changes to this policy",
                    "body": {
                        "how": "When this policy changes, we update the date at the top of this page. Changes that affect your rights are announced in advance to account administrators."
                    }
                },
                "contact": {
                    "heading": "13. Contact",
                    "body": {
                        "how": "Message us through the chat in the bottom corner of any yona.vn page, or leave your phone number on the Book a demo page. Both go straight into the Yona team's inbox."
                    }
                }
            }
        }
    },
    "LOGIN": {
        "TITLE": "Login to {installationName}",
        "EMAIL": {
            "LABEL": "Email",
            "PLACEHOLDER": "example@companyname.com",
            "ERROR": "Please enter a valid email address"
        },
        "PASSWORD": {
            "LABEL": "Password",
            "PLACEHOLDER": "Password"
        },
        "API": {
            "SUCCESS_MESSAGE": "Login successful",
            "ERROR_MESSAGE": "Could not connect to the server. Please try again.",
            "UNAUTH": "Username or password is incorrect. Please try again."
        },
        "OAUTH": {
            "GOOGLE_LOGIN": "Login with Google",
            "GOOGLE_CONTINUE": "Continue with Google",
            "BUSINESS_ACCOUNTS_ONLY": "Please use your company email address to login",
            "NO_ACCOUNT_FOUND": "We couldn't find an account for your email address."
        },
        "FORGOT_PASSWORD": "Forgot your password?",
        "CREATE_NEW_ACCOUNT": "Create a new account",
        "SUBMIT": "Login",
        "SAML": {
            "LABEL": "Login via SSO",
            "TITLE": "Initiate Single Sign-on (SSO)",
            "SUBTITLE": "Enter your work email to access your organization",
            "BACK_TO_LOGIN": "Login via Password",
            "WORK_EMAIL": {
                "LABEL": "Work Email",
                "PLACEHOLDER": "Enter your work email"
            },
            "SUBMIT": "Continue with SSO",
            "API": {
                "ERROR_MESSAGE": "SSO authentication failed. Please check your credentials and try again."
            }
        }
    },
    "MACROS": {
        "HEADER": "Macros",
        "DESCRIPTION": "A macro is a set of saved actions that help customer service agents easily complete tasks. The agents can define a set of actions like tagging a conversation with a label, sending an email transcript, updating a custom attribute, etc., and they can run these actions in a single click.",
        "LEARN_MORE": "Learn more about macros",
        "COUNT": "{n} macro | {n} macros",
        "HEADER_BTN_TXT": "Add a new macro",
        "HEADER_BTN_TXT_SAVE": "Save macro",
        "LOADING": "Fetching macros",
        "SEARCH_PLACEHOLDER": "Search macros...",
        "NO_RESULTS": "No macros found matching your search",
        "ERROR": "Something went wrong. Please try again",
        "ORDER_INFO": "Macros will run in the order you add your actions. You can rearrange them by dragging them by the handle beside each node.",
        "ADD": {
            "FORM": {
                "NAME": {
                    "LABEL": "Macro name",
                    "PLACEHOLDER": "Enter a name for your macro",
                    "ERROR": "Name is required for creating a macro"
                },
                "ACTIONS": {
                    "LABEL": "Actions"
                }
            },
            "API": {
                "SUCCESS_MESSAGE": "Macro added successfully",
                "ERROR_MESSAGE": "Unable to create macro, Please try again later"
            }
        },
        "LIST": {
            "TABLE_HEADER": {
                "NAME": "Name",
                "CREATED BY": "Created by",
                "LAST_UPDATED_BY": "Last updated by",
                "VISIBILITY": "Visibility",
                "ACTIONS": "Actions"
            },
            "404": "No macros found"
        },
        "DELETE": {
            "TOOLTIP": "Delete macro",
            "CONFIRM": {
                "MESSAGE": "Are you sure to delete ",
                "YES": "Yes, Delete",
                "NO": "No"
            },
            "API": {
                "SUCCESS_MESSAGE": "Macro deleted successfully",
                "ERROR_MESSAGE": "There was an error deleting the macro. Please try again later"
            }
        },
        "VIEW": {
            "TOOLTIP": "View macro"
        },
        "EDIT": {
            "TOOLTIP": "Edit macro",
            "API": {
                "SUCCESS_MESSAGE": "Macro updated successfully",
                "ERROR_MESSAGE": "Could not update Macro, Please try again later"
            }
        },
        "EDITOR": {
            "START_FLOW": "Start Flow",
            "END_FLOW": "End Flow",
            "LOADING": "Fetching macro",
            "ADD_BTN_TOOLTIP": "Add new action",
            "DELETE_BTN_TOOLTIP": "Delete Action",
            "VISIBILITY": {
                "LABEL": "Macro Visibility",
                "GLOBAL": {
                    "LABEL": "Public",
                    "DESCRIPTION": "This macro is available publicly for all agents in this account.",
                    "CREATE_DISABLED_DESCRIPTION": "Only administrators can create public macros.",
                    "EDIT_DISABLED_DESCRIPTION": "Only administrators can edit public macros."
                },
                "PERSONAL": {
                    "LABEL": "Private",
                    "DESCRIPTION": "This macro will be private to you and not be available to others."
                }
            }
        },
        "EXECUTE": {
            "BUTTON_TOOLTIP": "Execute",
            "PREVIEW": "Preview Macro",
            "EXECUTED_SUCCESSFULLY": "Macro executed successfully",
            "EXECUTED_WITHOUT_RESOLVING": "Macro executed. The conversation was not resolved because required attributes are missing."
        },
        "ERRORS": {
            "ATTRIBUTE_KEY_REQUIRED": "Attribute key is required",
            "FILTER_OPERATOR_REQUIRED": "Filter operator is required",
            "VALUE_REQUIRED": "Value is required",
            "VALUE_MUST_BE_BETWEEN_1_AND_998": "Value must be between 1 and 998",
            "ACTION_PARAMETERS_REQUIRED": "Action parameters are required",
            "ATLEAST_ONE_CONDITION_REQUIRED": "At least one condition is required",
            "ATLEAST_ONE_ACTION_REQUIRED": "At least one action is required"
        },
        "ACTIONS": {
            "ASSIGN_TEAM": "Assign a Team",
            "ASSIGN_AGENT": "Assign an Agent",
            "ADD_LABEL": "Add a Label",
            "REMOVE_LABEL": "Remove a Label",
            "REMOVE_ASSIGNED_AGENT": "Remove Assigned Agent",
            "REMOVE_ASSIGNED_TEAM": "Remove Assigned Team",
            "SEND_EMAIL_TRANSCRIPT": "Send an Email Transcript",
            "MUTE_CONVERSATION": "Mute Conversation",
            "SNOOZE_CONVERSATION": "Snooze Conversation",
            "RESOLVE_CONVERSATION": "Resolve Conversation",
            "CHANGE_STATUS": "Change Status",
            "SEND_ATTACHMENT": "Send Attachment",
            "SEND_MESSAGE": "Send a Message",
            "SEND_CANNED_CARD": "Send a card from a canned response",
            "CHANGE_PRIORITY": "Change Priority",
            "ADD_PRIVATE_NOTE": "Add a Private Note",
            "SEND_WEBHOOK_EVENT": "Send Webhook Event"
        },
        "PRIORITY_TYPES": {
            "NONE": "None",
            "LOW": "Low",
            "MEDIUM": "Medium",
            "HIGH": "High",
            "URGENT": "Urgent"
        }
    },
    "MERGE_CONTACTS": {
        "TITLE": "Merge profiles",
        "DESCRIPTION": "Combine two profiles into one, including all attributes and conversations. In case of conflict, the primary profile’s attributes will take precedence.",
        "PRIMARY": {
            "TITLE": "Primary profile",
            "HELP_LABEL": "To be deleted"
        },
        "PARENT": {
            "TITLE": "Profile to merge",
            "PLACEHOLDER": "Search for a profile",
            "HELP_LABEL": "To be kept"
        },
        "SUMMARY": {
            "TITLE": "Summary",
            "DELETE_WARNING": "The profile of <strong>{primaryContactName}</strong> will be deleted.",
            "ATTRIBUTE_WARNING": "Details of <strong>{primaryContactName}</strong> will be copied to <strong>{parentContactName}</strong>."
        },
        "SEARCH": {
            "ERROR_MESSAGE": "Something went wrong. Please try again later."
        },
        "FORM": {
            "SUBMIT": " Merge profiles",
            "CANCEL": "Cancel",
            "CHILD_CONTACT": {
                "ERROR": "Select a profile to merge"
            },
            "SUCCESS_MESSAGE": "Profiles merged",
            "ERROR_MESSAGE": "Could not merge profiles, try again!"
        },
        "DROPDOWN_ITEM": {
            "ID": "(ID: {identifier})"
        }
    },
    "MESSAGING": {
        "errors": {
            "not_allowed": "A :type message cannot be sent in this direction.",
            "not_answerable": "A :type message does not accept replies.",
            "unknown_choice": "That option is not part of the message.",
            "already_submitted": "This message has already been answered.",
            "invalid_action": "Invalid button.",
            "invalid_url": "Links must start with http:// or https://.",
            "invalid_phone": "Invalid phone number.",
            "invalid_price": "Invalid price.",
            "unknown_payment_account": "The receiving bank account was not found.",
            "payment_account_not_allowed": "You are not allowed to send a bank transfer card with this account.",
            "duplicate_payment_account": "This bank and account number were already added."
        },
        "settings": {
            "invalid_channel": "Invalid channel: check the channel type and its link or phone number.",
            "invalid_alert_tone": "This alert sound is not in the list."
        },
        "preview": {
            "deleted": "Message recalled",
            "image": "Sent a photo",
            "file": "Sent a file",
            "sticker": "Sticker"
        },
        "delivery": {
            "numbered_prompt": "Reply with the number of your choice:"
        },
        "bank_transfer": {
            "preview": "Bank transfer via :bank",
            "bank_line": "Bank :bank, account :account",
            "holder": "Account holder :name",
            "amount": "Amount :amount",
            "memo": "Memo: :memo"
        },
        "kit": {
            "copied": "Copied",
            "copy": "Copy {label}",
            "read_only": "The customer can tap this in the widget",
            "bank_transfer_title": "Bank transfer",
            "show_qr": "Show QR code to scan",
            "bank_transfer_qr_alt": "Bank transfer QR code",
            "bank": "Bank",
            "account_number": "Account number",
            "account_holder": "Account holder",
            "transfer_amount": "Amount",
            "transfer_memo": "Memo",
            "paid": "Payment received"
        }
    },
    "MFA_SETTINGS": {
        "TITLE": "Two-Factor Authentication",
        "SUBTITLE": "Protect your account from unauthorized access with TOTP-based authentication. This adds an extra layer of security to your account.",
        "DESCRIPTION": "Add an extra layer of security to your account using a time-based one-time password (TOTP)",
        "STATUS_TITLE": "Authentication Status",
        "STATUS_DESCRIPTION": "Manage your two-factor authentication settings and backup recovery codes",
        "ENABLED": "Enabled",
        "DISABLED": "Disabled",
        "STATUS_ENABLED": "Two-factor authentication is active",
        "STATUS_ENABLED_DESC": "Your account is protected with an additional layer of security",
        "ENABLE_BUTTON": "Enable Two-Factor Authentication",
        "ENHANCE_SECURITY": "Enhance Your Account Security",
        "ENHANCE_SECURITY_DESC": "Two-factor authentication adds an extra layer of security by requiring a verification code from your authenticator app in addition to your password.",
        "SETUP": {
            "STEP_NUMBER_1": "1",
            "STEP_NUMBER_2": "2",
            "STEP1_TITLE": "Scan QR Code with Your Authenticator App",
            "STEP1_DESCRIPTION": "Use Google Authenticator, Authy, or any TOTP-compatible app",
            "LOADING_QR": "Loading...",
            "MANUAL_ENTRY": "Can't scan? Enter code manually",
            "SECRET_KEY": "Secret Key",
            "COPY": "Copy",
            "ENTER_CODE": "Enter the 6-digit code from your authenticator app",
            "ENTER_CODE_PLACEHOLDER": "000000",
            "VERIFY_BUTTON": "Verify & Continue",
            "CANCEL": "Cancel",
            "ERROR_STARTING": "MFA not enabled. Please contact administrator.",
            "INVALID_CODE": "Invalid verification code",
            "SECRET_COPIED": "Secret key copied to clipboard",
            "SUCCESS": "Two-factor authentication has been enabled successfully"
        },
        "BACKUP": {
            "TITLE": "Save Your Backup Codes",
            "DESCRIPTION": "Keep these codes safe. Each can be used once if you lose access to your authenticator",
            "IMPORTANT": "Important:",
            "IMPORTANT_NOTE": " Save these codes in a secure location. You won't be able to see them again.",
            "DOWNLOAD": "Download",
            "COPY_ALL": "Copy All",
            "CONFIRM": "I have saved my backup codes in a secure location and understand that I won't be able to see them again",
            "COMPLETE_SETUP": "Complete Setup",
            "CODES_COPIED": "Backup codes copied to clipboard"
        },
        "MANAGEMENT": {
            "BACKUP_CODES": "Backup Codes",
            "BACKUP_CODES_DESC": "Generate new codes if you've lost or used your existing ones",
            "REGENERATE": "Regenerate Backup Codes",
            "DISABLE_MFA": "Disable 2FA",
            "DISABLE_MFA_DESC": "Remove two-factor authentication from your account",
            "DISABLE_BUTTON": "Disable Two-Factor Authentication"
        },
        "LOW_BACKUP_CODES": {
            "MESSAGE": "You have {n} backup code remaining. Generate new codes to avoid getting locked out if you lose access to your authenticator. | You have {n} backup codes remaining. Generate new codes to avoid getting locked out if you lose access to your authenticator.",
            "NONE_LEFT": "You have no backup codes remaining. Generate new codes now to avoid getting locked out if you lose access to your authenticator.",
            "ACTION": "Generate codes"
        },
        "DISABLE": {
            "TITLE": "Disable Two-Factor Authentication",
            "DESCRIPTION": "You'll need to enter your password and either a verification code from your authenticator app or a backup code to disable two-factor authentication.",
            "PASSWORD": "Password",
            "OTP_CODE": "Verification Code",
            "OTP_CODE_PLACEHOLDER": "000000",
            "BACKUP_CODE": "Backup Code",
            "BACKUP_CODE_PLACEHOLDER": "Enter one of your backup codes",
            "USE_BACKUP_CODE": "Lost access to your authenticator? Use a backup code instead",
            "USE_OTP_CODE": "Use a verification code from your authenticator app",
            "CONFIRM": "Disable 2FA",
            "CANCEL": "Cancel",
            "SUCCESS": "Two-factor authentication has been disabled",
            "ERROR": "Failed to disable MFA. Please check your credentials."
        },
        "REGENERATE": {
            "TITLE": "Regenerate Backup Codes",
            "DESCRIPTION": "This will invalidate your existing backup codes and generate new ones. Enter your verification code to continue.",
            "OTP_CODE": "Verification Code",
            "OTP_CODE_PLACEHOLDER": "000000",
            "CONFIRM": "Generate New Codes",
            "CANCEL": "Cancel",
            "NEW_CODES_TITLE": "New Backup Codes Generated",
            "NEW_CODES_DESC": "Your old backup codes have been invalidated. Save these new codes in a secure location.",
            "CODES_IMPORTANT": "Important:",
            "CODES_IMPORTANT_NOTE": " Each code can only be used once. Save them before closing this window.",
            "DOWNLOAD_CODES": "Download Codes",
            "COPY_ALL_CODES": "Copy All Codes",
            "CODES_SAVED": "I've Saved My Codes",
            "SUCCESS": "New backup codes have been generated",
            "ERROR": "Failed to regenerate backup codes"
        }
    },
    "MFA_VERIFICATION": {
        "TITLE": "Two-Factor Authentication",
        "DESCRIPTION": "Enter your verification code to continue",
        "AUTHENTICATOR_APP": "Authenticator App",
        "BACKUP_CODE": "Backup Code",
        "ENTER_OTP_CODE": "Enter 6-digit code from your authenticator app",
        "ENTER_BACKUP_CODE": "Enter one of your backup codes",
        "BACKUP_CODE_PLACEHOLDER": "000000",
        "VERIFY_BUTTON": "Verify",
        "TRY_ANOTHER_METHOD": "Try another verification method",
        "CANCEL_LOGIN": "Cancel and return to login",
        "HELP_TEXT": "Having trouble signing in?",
        "LEARN_MORE": "Learn more about 2FA",
        "HELP_MODAL": {
            "TITLE": "Two-Factor Authentication Help",
            "AUTHENTICATOR_TITLE": "Using an Authenticator App",
            "AUTHENTICATOR_DESC": "Open your authenticator app (Google Authenticator, Authy, etc.) and enter the 6-digit code shown for your account.",
            "BACKUP_TITLE": "Using a Backup Code",
            "BACKUP_DESC": "If you don't have access to your authenticator app, you can use one of the backup codes you saved when setting up 2FA. Each code can only be used once.",
            "CONTACT_TITLE": "Need More Help?",
            "CONTACT_DESC_CLOUD": "If you've lost access to both your authenticator app and backup codes, please reach out to {installationName} support for assistance.",
            "CONTACT_DESC_SELF_HOSTED": "If you've lost access to both your authenticator app and backup codes, please contact your administrator for assistance."
        },
        "VERIFICATION_FAILED": "Verification failed. Please try again."
    },
    "MOBILE_TAB_BAR": {
        "LABEL": "Main navigation",
        "MORE": "More",
        "CLOSE_MENU": "Close",
        "UNREAD": "{count} unread conversations"
    },
    "NETWORK": {
        "NOTIFICATION": {
            "OFFLINE": "Offline",
            "RECONNECTING": "Reconnecting...",
            "RECONNECT_SUCCESS": "Reconnected"
        },
        "BUTTON": {
            "REFRESH": "Refresh"
        }
    },
    "NEW_CONVERSATION": {
        "BUTTON_LABEL": "Start conversation",
        "TITLE": "New conversation",
        "DESC": "Start a new conversation by sending a new message.",
        "NO_INBOX": "Couldn't find an inbox to start a new conversation with this person.",
        "FORM": {
            "TO": {
                "LABEL": "To"
            },
            "INBOX": {
                "LABEL": "Via Inbox",
                "PLACEHOLDER": "Choose source inbox",
                "ERROR": "Select an inbox"
            },
            "SUBJECT": {
                "LABEL": "Subject",
                "PLACEHOLDER": "Subject",
                "ERROR": "Subject can't be empty"
            },
            "MESSAGE": {
                "LABEL": "Message",
                "PLACEHOLDER": "Write your message here",
                "ERROR": "Message can't be empty"
            },
            "ATTACHMENTS": {
                "SELECT": "Choose files",
                "HELP_TEXT": "Drag and drop files here or choose files to attach"
            },
            "SUBMIT": "Send message",
            "CANCEL": "Cancel",
            "SUCCESS_MESSAGE": "Message sent!",
            "GO_TO_CONVERSATION": "View",
            "ERROR_MESSAGE": "Couldn't send! try again"
        }
    },
    "NOTIFICATIONS": {
        "notification_title": {
            "conversation_creation": "A conversation (#{display_id}) has been created in {inbox_name}",
            "conversation_assignment": "A conversation (#{display_id}) has been assigned to you",
            "assigned_conversation_new_message": "A new message is created in conversation (#{display_id})",
            "conversation_mention": "You have been mentioned in conversation (#{display_id})",
            "sla_missed_first_response": "SLA target first response missed for conversation (#{display_id})",
            "sla_missed_next_response": "SLA target next response missed for conversation (#{display_id})",
            "sla_missed_resolution": "SLA target resolution missed for conversation (#{display_id})",
            "friend_request": "{name} sent you a friend request",
            "friend_request_accepted": "{name} accepted your friend request"
        },
        "friendship": {
            "friend_request": "sent you a friend request",
            "friend_request_accepted": "accepted your friend request"
        },
        "attachment": "Attachment",
        "no_content": "No content",
        "email": {
            "conversation_creation": "{agent_name}, A new conversation [ID - {display_id}] has been created in {inbox_name}.",
            "conversation_assignment": "{agent_name}, A new conversation [ID - {display_id}] has been assigned to you.",
            "conversation_mention": "{agent_name}, You have been mentioned in conversation [ID - {display_id}]",
            "assigned_conversation_new_message": "{agent_name}, New message in your assigned conversation [ID - {display_id}].",
            "participating_conversation_new_message": "{agent_name}, New message in your participating conversation [ID - {display_id}]."
        },
        "account": {
            "greeting": "Hello,",
            "contact_export_complete": {
                "subject": "Your contact export file is ready to download",
                "body": "Your contact export file is ready.",
                "action": "Download the export file"
            },
            "contact_import_complete": {
                "subject": "Contact import completed",
                "body": "Your contact import has been completed. Open the Contacts page to see the imported contacts.",
                "imported": "Records imported: {count}",
                "failed": "Records failed: {count}",
                "action_view_contacts": "View imported contacts",
                "action_view_failed": "View failed records"
            },
            "contact_import_failed": {
                "subject": "Contact import failed",
                "body": "Your contact import has failed. The CSV file you uploaded may not be valid. Please check the file and make sure it follows the required format."
            }
        }
    },
    "ONBOARDING": {
        "TITLE": "Hey 👋, Welcome to {installationName}!",
        "DESCRIPTION": "Thanks for signing up. We want you to get the most out of {installationName}. Here are a few things you can do in {installationName} to make the experience delightful.",
        "GREETING_MORNING": "👋 Good morning, {name}. Welcome to {installationName}.",
        "GREETING_AFTERNOON": "👋 Good afternoon, {name}. Welcome to {installationName}.",
        "GREETING_EVENING": "👋 Good evening, {name}. Welcome to {installationName}.",
        "READ_LATEST_UPDATES": "Read our latest updates",
        "ALL_CONVERSATION": {
            "TITLE": "All your conversations in one place",
            "DESCRIPTION": "Messages your customers send through Zalo, your website, email and more land in one shared inbox. Filter conversations by channel, label and status.",
            "NEW_LINK": "Connect Zalo, your website or email"
        },
        "TEAM_MEMBERS": {
            "TITLE": "Invite your team members",
            "DESCRIPTION": "Since you are getting ready to talk to your customer, bring in your teammates to assist you. You can invite your teammates by adding their email addresses to the agent list.",
            "NEW_LINK": "Click here to invite a team member"
        },
        "LABELS": {
            "TITLE": "Organize conversations with labels",
            "DESCRIPTION": "Labels provide an easier way to categorize your conversation. Create some labels like #support-enquiry, #billing-question etc., so that you can use them in a conversation later.",
            "NEW_LINK": "Click here to create tags"
        },
        "CANNED_RESPONSES": {
            "TITLE": "Create canned responses",
            "DESCRIPTION": "Pre-written quick reply templates help you quickly respond to a conversation. Agents can type the '/' character followed by the shortcode to insert a response.",
            "NEW_LINK": "Click here to create a canned response"
        }
    },
    "ONBOARDING_INBOX_SETUP": {
        "GREETING": "Let's set up a few things",
        "SUBTITLE": "This will give you head-start in your workspace",
        "CONTINUE": "Continue",
        "SKIP": "Skip",
        "ERROR": "Something went wrong. Please try again.",
        "WHATSAPP_CONNECTED": "WhatsApp connected successfully",
        "FACEBOOK_CONNECTED": "Facebook connected successfully",
        "META_RESTRICTION": {
            "MESSAGE": "Inbox setup for Facebook, Instagram, and WhatsApp is temporarily unavailable due to an API-level issue on Meta’s side, not a problem with {installationName}. We’re working closely with Meta to resolve it as quickly as possible.",
            "STATUS_LINK": "View status updates"
        },
        "CREATED_FOR_YOU": {
            "TITLE": "We've created the following for you",
            "LIVE_CHAT": "Live Chat widget",
            "LIVE_CHAT_DESCRIPTION": "Instant messenger for your website",
            "LIVE_CHAT_STATUS": "Almost done…",
            "LIVE_CHAT_READY": "Ready",
            "HELP_CENTER": "Help Center",
            "HELP_CENTER_DESCRIPTION": "Your digital encyclopedia",
            "HELP_CENTER_GENERATING": "Creating your help center…",
            "HELP_CENTER_ANALYZING_WEBSITE": "Analyzing your website…",
            "HELP_CENTER_SETTING_UP_CATEGORIES": "Setting up categories…",
            "HELP_CENTER_CURATING_ARTICLES": "Curating articles…",
            "HELP_CENTER_ARTICLES": "Created {count} article | Created {count} articles",
            "HELP_CENTER_CATEGORIES": "{count} category | {count} categories",
            "HELP_CENTER_SUMMARY": "Created {count} article across {categories} | Created {count} articles across {categories}"
        },
        "CHANNELS": {
            "TITLE": "Connect all your conversation channels",
            "HEADER": "We found a few channels you can connect",
            "CONNECT": "Connect",
            "CONNECTED": "Connected",
            "MORE_CHANNELS_NOTE": "Set up {email} and {voice} channels later inside the app",
            "MORE_CHANNELS_EMAIL": "Email",
            "MORE_CHANNELS_VOICE": "Voice",
            "VIEW_ALL": "View all",
            "GMAIL": "Gmail",
            "OUTLOOK": "Outlook",
            "OTHER_EMAIL": "Other Email Providers"
        },
        "CHANNELS_DIALOG": {
            "TITLE": "Connect all your channels instantly",
            "SUBTITLE": "Manage all of them from one dashboard. You can also set up and edit inboxes later inside the app.",
            "NOTE": "SMS, API, Voice, and other email providers can be set up later from your dashboard.",
            "CONNECT_TITLE": "Connect your {name} account",
            "CONNECT_SUBTITLE": "Fill out these quick details",
            "CONNECT": "Connect",
            "BACK": "Back",
            "SETUP_LATER": "Setup later in app",
            "FACEBOOK_SUBTITLE": "Authorize access and choose a Page to connect.",
            "FACEBOOK_LAUNCH": "Continue with Facebook",
            "FACEBOOK_SELECT_PAGE": "Select a Page to connect",
            "FACEBOOK_LOADING": "Loading your Facebook Pages…",
            "FACEBOOK_NO_PAGES": "No connectable Pages found. All your Pages are already connected.",
            "FACEBOOK_ERROR": "Couldn't connect to Facebook. Please try again."
        }
    },
    "ONBOARDING_NEXT": {
        "GREETING": "Hello {name}!",
        "SUBTITLE": "Please review the following details",
        "YOUR_DETAILS": "Your details",
        "COMPANY_DETAILS": "Company details",
        "FIELDS": {
            "EMAIL": "Email",
            "BUSINESS_NAME": "Business name",
            "YOUR_ROLE": "Your Role",
            "WEBSITE": "Website",
            "LANGUAGE": "Language",
            "TIMEZONE": "Timezone",
            "COMPANY_SIZE": "Company Size",
            "INDUSTRY": "Industry",
            "REFERRAL_SOURCE": "Where did you find us?"
        },
        "PLACEHOLDERS": {
            "ENTER_BUSINESS_NAME": "e.g. Hoa Linen Shop",
            "SELECT_ROLE": "Select your role",
            "ENTER_WEBSITE": "e.g. yourshop.com",
            "SELECT_LANGUAGE": "Select language",
            "SELECT_TIMEZONE": "Select timezone",
            "SELECT_COMPANY_SIZE": "Select company size",
            "SELECT_INDUSTRY": "Select industry",
            "SELECT_REFERRAL_SOURCE": "Select source"
        },
        "OPTIONAL": "Optional",
        "OPTIONS": {
            "USER_ROLE": {
                "OWNER": "Shop owner / business owner",
                "SALES_MANAGER": "Sales manager",
                "CUSTOMER_SUPPORT": "Sales consultant / customer care",
                "MARKETING": "Marketing",
                "OTHER": "Other"
            },
            "INDUSTRY": {
                "FASHION": "Fashion",
                "BEAUTY": "Cosmetics & beauty",
                "MOTHER_BABY": "Mother & baby",
                "FOOD_BEVERAGE": "Food & beverage",
                "ELECTRONICS": "Electronics & accessories",
                "HOME_LIVING": "Furniture & household",
                "EDUCATION": "Education & courses",
                "TRAVEL_SERVICES": "Travel & services",
                "REAL_ESTATE": "Real estate",
                "WHOLESALE": "Wholesale / distributor",
                "OTHER": "Other"
            },
            "REFERRAL_SOURCE": {
                "ZALO": "Zalo",
                "FACEBOOK": "Facebook",
                "TIKTOK": "TikTok",
                "GOOGLE": "Google",
                "FRIEND": "Friend or partner referral",
                "YOUTUBE": "YouTube",
                "OTHER": "Other"
            }
        },
        "EMAIL_VERIFIED": "Email verified",
        "SETTING_UP": "Setting up your account...",
        "CONTINUE": "Continue",
        "SAVING": "Saving...",
        "VALIDATION_ERROR": "Please fill in all required fields",
        "SUCCESS": "Details saved successfully",
        "ERROR": "Could not save details. Please try again."
    },
    "OVERVIEW_REPORTS": {
        "HEADER": "Overview",
        "LIVE": "Live",
        "HEATMAP_ARIA_LABEL": "{metric} by day and hour",
        "ACCOUNT_CONVERSATIONS": {
            "HEADER": "Open Conversations",
            "LOADING_MESSAGE": "Loading conversation metrics...",
            "OPEN": "Open",
            "UNATTENDED": "Unattended",
            "UNASSIGNED": "Unassigned",
            "PENDING": "Pending"
        },
        "CONVERSATION_HEATMAP": {
            "HEADER": "Conversation Traffic",
            "NO_CONVERSATIONS": "No conversations",
            "CONVERSATION": "{count} conversation",
            "CONVERSATIONS": "{count} conversations",
            "DOWNLOAD_REPORT": "Download report"
        },
        "RESOLUTION_HEATMAP": {
            "HEADER": "Resolutions",
            "NO_CONVERSATIONS": "No conversations",
            "CONVERSATION": "{count} conversation",
            "CONVERSATIONS": "{count} conversations",
            "DOWNLOAD_REPORT": "Download report"
        },
        "AGENT_CONVERSATIONS": {
            "HEADER": "Conversations by agents",
            "LOADING_MESSAGE": "Loading agent metrics...",
            "NO_AGENTS": "There are no conversations by agents",
            "TABLE_HEADER": {
                "AGENT": "Agent",
                "OPEN": "Open",
                "UNATTENDED": "Unattended",
                "STATUS": "Status"
            }
        },
        "TEAM_CONVERSATIONS": {
            "ALL_TEAMS": "All Teams",
            "HEADER": "Conversations by teams",
            "LOADING_MESSAGE": "Loading team metrics...",
            "NO_TEAMS": "There is no data available",
            "TABLE_HEADER": {
                "TEAM": "Team",
                "OPEN": "Open",
                "UNATTENDED": "Unattended",
                "STATUS": "Status"
            }
        },
        "AGENT_STATUS": {
            "HEADER": "Agent status",
            "ONLINE": "Online",
            "BUSY": "Busy",
            "OFFLINE": "Offline"
        }
    },
    "PAGINATION_FOOTER": {
        "SHOWING": "Showing {startItem} - {endItem} of {totalItems} item | Showing {startItem} - {endItem} of {totalItems} items",
        "CURRENT_PAGE_INFO": "{currentPage} of {totalPages} page | {currentPage} of {totalPages} pages"
    },
    "PAYMENT_ACCOUNTS": {
        "HEADER": "Bank transfer",
        "DESCRIPTION": "Bank accounts used when sending a bank transfer card in a conversation. Customers pay straight into your account, Yona never holds the money.",
        "LOADING": "Loading accounts",
        "LIST": {
            "TITLE": "Receiving accounts",
            "EMPTY": "No receiving account yet.",
            "ADD": "Add account",
            "DEFAULT_BADGE": "Default"
        },
        "FORM": {
            "EDIT": "Edit",
            "DELETE": "Delete",
            "SAVE": "Save changes",
            "CREATE": "Add account",
            "CANCEL": "Cancel",
            "BANK": {
                "LABEL": "Bank",
                "PLACEHOLDER": "Choose a bank",
                "SEARCH_PLACEHOLDER": "Search banks...",
                "EMPTY": "No bank found"
            },
            "ACCOUNT_NUMBER": {
                "LABEL": "Account number",
                "PLACEHOLDER": "Digits only",
                "INVALID": "Account number must be 4-30 digits."
            },
            "ACCOUNT_NAME": {
                "LABEL": "Account holder",
                "PLACEHOLDER": "HKD GOM MOC",
                "HINT": "Uppercase without diacritics, exactly as the bank shows it, so customers can check it."
            },
            "MEMO_TEMPLATE": {
                "LABEL": "Transfer memo",
                "HINT": "Customers see this in their banking app (up to 25 characters, no diacritics). Add {ma_hoi_thoai} to include the conversation code for reconciliation."
            },
            "IS_DEFAULT": {
                "LABEL": "Set as default account"
            },
            "ALLOW_ALL_AGENTS": {
                "LABEL": "Let every agent send bank transfer cards in conversations"
            }
        },
        "ADD": {
            "TITLE": "Add account",
            "SUCCESS": "Account added",
            "ERROR": "Something went wrong, please try again"
        },
        "EDIT": {
            "TITLE": "Edit account",
            "SUCCESS": "Changes saved",
            "ERROR": "Something went wrong, please try again"
        },
        "DELETE": {
            "SUCCESS": "Account deleted",
            "ERROR": "Something went wrong, please try again",
            "CONFIRM": {
                "TITLE": "Delete account?",
                "MESSAGE": "Agents will no longer be able to send bank transfer cards with this account:",
                "YES": "Yes, delete",
                "NO": "No, keep it"
            }
        },
        "PREVIEW": {
            "TITLE": "What customers see",
            "EMPTY": "Save the account to see its QR code.",
            "QR_ALT": "Bank transfer QR code",
            "BANK": "Bank",
            "ACCOUNT_NUMBER": "Account number",
            "NOTE": "The QR code follows the VietQR standard and scans with any banking app."
        }
    },
    "PEOPLE": {
        "USERNAME": {
            "LABEL": "Username",
            "HINT": "3 to 30 characters: lowercase letters, numbers, dots, underscores.",
            "CHECKING": "Checking…",
            "AVAILABLE": "This name is available",
            "UNAVAILABLE": "This name is taken or not valid",
            "REQUIRED": "Enter a username",
            "INVALID": "Use 3 to 30 lowercase letters, numbers, dots, or underscores",
            "TAKEN": "This name is taken",
            "RESERVED": "This name is reserved. Pick another one"
        },
        "NAME": {
            "LABEL": "Display name",
            "REQUIRED": "Enter a display name"
        },
        "WELCOME": {
            "TITLE": "Choose your name",
            "SUBTITLE": "Friends find you by this name.",
            "SUBMIT": "Continue",
            "ERROR": "Couldn't save. Try again"
        },
        "CHAT": {
            "TITLE": "Messages",
            "SEARCH_PLACEHOLDER": "Search by @username or name",
            "SEARCH_LABEL": "Find people",
            "NO_RESULTS": "No one found with this name",
            "SEARCH_ERROR": "Couldn't search. Try again",
            "LOAD_ERROR": "Couldn't load your conversations. Try again",
            "OPEN_ERROR": "Couldn't open the conversation. Try again"
        },
        "PROFILE": {
            "TITLE": "Profile",
            "BACK": "Back to messages",
            "CHANGE_PHOTO": "Change photo",
            "BIO": "Bio",
            "BIO_PLACEHOLDER": "A few lines about you",
            "PRIVACY": "Privacy",
            "GROUP_ADD": "Who can add me to groups",
            "GROUP_ADD_EVERYONE": "Everyone",
            "GROUP_ADD_NOBODY": "No one",
            "SHOW_LAST_SEEN": "Show last seen",
            "SAVE": "Save",
            "SAVED": "Profile saved",
            "SAVE_ERROR": "Couldn't save your profile. Try again",
            "PHOTO_SAVED": "Photo updated",
            "LOGOUT": "Sign out"
        }
    },
    "PHONE_INPUT": {
        "SEARCH_PLACEHOLDER": "Search country",
        "ERROR": "Phone number can only contain digits, optionally starting with +",
        "DIAL_CODE_ERROR": "Please select a dial code from the list"
    },
    "PROFILE_SETTINGS": {
        "LINK": "Profile Settings",
        "TITLE": "Profile Settings",
        "BTN_TEXT": "Update Profile",
        "DELETE_AVATAR": "Delete Avatar",
        "AVATAR_DELETE_SUCCESS": "Avatar has been deleted successfully",
        "AVATAR_DELETE_FAILED": "There is an error while deleting avatar, please try again",
        "UPDATE_SUCCESS": "Your profile has been updated successfully",
        "PASSWORD_UPDATE_SUCCESS": "Your password has been changed successfully",
        "AFTER_EMAIL_CHANGED": "Your profile has been updated successfully, please login again as your login credentials are changed",
        "FORM": {
            "PICTURE": "Profile Picture",
            "AVATAR": "Profile Image",
            "ERROR": "Please fix form errors",
            "REMOVE_IMAGE": "Remove",
            "UPLOAD_IMAGE": "Upload image",
            "UPDATE_IMAGE": "Update image",
            "PROFILE_SECTION": {
                "TITLE": "Profile",
                "NOTE": "Your email address is your identity and is used to log in."
            },
            "SEND_MESSAGE": {
                "TITLE": "Hotkey to send messages",
                "NOTE": "You can select a hotkey (either Enter or Cmd/Ctrl+Enter) based on your preference of writing.",
                "UPDATE_SUCCESS": "Your settings have been updated successfully",
                "CARD": {
                    "ENTER_KEY": {
                        "HEADING": "Enter (↵)",
                        "CONTENT": "Send messages by pressing Enter key instead of clicking the send button."
                    },
                    "CMD_ENTER_KEY": {
                        "HEADING": "Cmd/Ctrl + Enter (⌘ + ↵)",
                        "CONTENT": "Send messages by pressing Cmd/Ctrl + enter key instead of clicking the send button."
                    }
                }
            },
            "INTERFACE_SECTION": {
                "TITLE": "Interface",
                "NOTE": "Customize the look and feel of your {installationName} dashboard.",
                "FONT_SIZE": {
                    "TITLE": "Font size",
                    "NOTE": "Adjust the text size across the dashboard based on your preference.",
                    "UPDATE_SUCCESS": "Your font settings have been updated successfully",
                    "UPDATE_ERROR": "There is an error while updating the font settings, please try again",
                    "OPTIONS": {
                        "SMALLER": "Smaller",
                        "SMALL": "Small",
                        "DEFAULT": "Default",
                        "LARGE": "Large",
                        "LARGER": "Larger",
                        "EXTRA_LARGE": "Extra Large"
                    }
                },
                "COLOR_SCHEME": {
                    "TITLE": "Color mode",
                    "NOTE": "Light or dark. Applies to the dashboard only, not the widget or public pages.",
                    "UPDATE_ERROR": "Could not update the color mode, please try again",
                    "OPTIONS": {
                        "LIGHT": "Light",
                        "DARK": "Dark"
                    }
                },
                "LANGUAGE": {
                    "TITLE": "Preferred Language",
                    "NOTE": "Choose the language you want to use.",
                    "UPDATE_SUCCESS": "Your Language settings have been updated successfully",
                    "UPDATE_ERROR": "There is an error while updating the language settings, please try again",
                    "USE_ACCOUNT_DEFAULT": "Use account default"
                }
            },
            "MESSAGE_SIGNATURE_SECTION": {
                "TITLE": "Personal message signature",
                "NOTE": "Create a unique message signature to appear at the end of every message you send from any inbox. You can also include an inline image, which is supported in live-chat, email, and API inboxes.",
                "BTN_TEXT": "Save message signature",
                "API_ERROR": "Couldn't save signature! Try again",
                "API_SUCCESS": "Signature saved successfully",
                "IMAGE_UPLOAD_ERROR": "Couldn't upload image! Try again",
                "IMAGE_UPLOAD_SUCCESS": "Image added successfully. Please click on save to save the signature",
                "IMAGE_UPLOAD_SIZE_ERROR": "Image size should be less than {size}MB",
                "INLINE_IMAGE_WARNING": "Pasted inline images were removed. Please use the image upload button to add images to your signature."
            },
            "MESSAGE_SIGNATURE": {
                "LABEL": "Message Signature",
                "ERROR": "Message Signature cannot be empty",
                "PLACEHOLDER": "Insert your personal message signature here."
            },
            "PASSWORD_SECTION": {
                "TITLE": "Password",
                "NOTE": "Updating your password would reset your logins in multiple devices.",
                "BTN_TEXT": "Change password"
            },
            "SECURITY_SECTION": {
                "TITLE": "Security",
                "NOTE": "Manage additional security features for your account.",
                "MFA_BUTTON": "Manage Two-Factor Authentication"
            },
            "SESSIONS_SECTION": {
                "TITLE": "Active Sessions",
                "NOTE": "These are the devices currently logged in to your account.",
                "CURRENT": "Current session",
                "REVOKE": "Revoke",
                "REVOKE_SUCCESS": "Session revoked successfully",
                "REVOKE_ERROR": "Unable to revoke session. Please try again.",
                "FETCH_ERROR": "Unable to fetch sessions. Please try again.",
                "LAST_ACTIVE": "Last active",
                "UNKNOWN_DEVICE": "Unknown device"
            },
            "ACCESS_TOKEN": {
                "TITLE": "Access Token",
                "NOTE": "This token can be used if you are building an API based integration",
                "PAID_PLAN_NOTE": "API access tokens are available on paid plans.",
                "COPY": "Copy",
                "RESET": "Reset",
                "CONFIRM_RESET": "Are you sure?",
                "CONFIRM_HINT": "Click again to confirm",
                "RESET_SUCCESS": "Access token regenerated successfully",
                "RESET_ERROR": "Unable to regenerate access token. Please try again"
            },
            "AUDIO_NOTIFICATIONS_SECTION": {
                "TITLE": "Audio Alerts",
                "NOTE": "Enable audio alerts in dashboard for new messages and conversations.",
                "PLAY": "Play sound",
                "ALERT_TYPES": {
                    "NONE": "None",
                    "MINE": "Assigned",
                    "ALL": "All",
                    "ASSIGNED": "My assigned conversations",
                    "UNASSIGNED": "Unassigned conversations",
                    "NOTME": "Open conversations assigned to others"
                },
                "ALERT_COMBINATIONS": {
                    "NONE": "You haven't selected any options, you won't receive any audio alerts.",
                    "ASSIGNED": "You'll receive alerts for conversations assigned to you.",
                    "UNASSIGNED": "You'll receive alerts for any unassigned conversations.",
                    "NOTME": "You'll receive alerts for conversations assigned to others.",
                    "ASSIGNED+UNASSIGNED": "You'll receive alerts for your assigned conversations and any unattended ones.",
                    "ASSIGNED+NOTME": "You'll receive alerts for conversations assigned to you and to others, but not for unassigned ones.",
                    "NOTME+UNASSIGNED": "You'll receive alerts for unattended conversations and those assigned to others.",
                    "ASSIGNED+NOTME+UNASSIGNED": "You'll receive alerts for all conversations."
                },
                "ALERT_TYPE": {
                    "TITLE": "Alert events for conversations",
                    "NONE": "None",
                    "ASSIGNED": "Assigned Conversations",
                    "ALL_CONVERSATIONS": "All Conversations"
                },
                "DEFAULT_TONE": {
                    "TITLE": "Alert tone:"
                },
                "CONDITIONS": {
                    "TITLE": "Alert conditions:",
                    "CONDITION_ONE": "Send audio alerts only if the browser window is not active",
                    "CONDITION_TWO": "Send alerts every 30s until all the assigned conversations are read"
                },
                "SOUND_PERMISSION_ERROR": "Autoplay is disabled in your browser. To hear alerts automatically, enable sound permission in your browser settings or interact with the page.",
                "READ_MORE": "Read more"
            },
            "EMAIL_NOTIFICATIONS_SECTION": {
                "TITLE": "Email Notifications",
                "NOTE": "Update your email notification preferences here",
                "CONVERSATION_ASSIGNMENT": "Send email notifications when a conversation is assigned to me",
                "CONVERSATION_CREATION": "Send email notifications when a new conversation is created",
                "CONVERSATION_MENTION": "Send email notifications when you are mentioned in a conversation",
                "ASSIGNED_CONVERSATION_NEW_MESSAGE": "Send email notifications when a new message is created in an assigned conversation",
                "PARTICIPATING_CONVERSATION_NEW_MESSAGE": "Send email notifications when a new message is created in a participating conversation",
                "SLA_MISSED_FIRST_RESPONSE": "Send email notifications when a conversation misses first response SLA",
                "SLA_MISSED_NEXT_RESPONSE": "Send email notifications when a conversation misses next response SLA",
                "SLA_MISSED_RESOLUTION": "Send email notifications when a conversation misses resolution SLA"
            },
            "NOTIFICATIONS": {
                "TITLE": "Notification preferences",
                "TYPE_TITLE": "Notification type",
                "EMAIL": "Email",
                "PUSH": "Push notification",
                "TYPES": {
                    "CONVERSATION_CREATED": "A new conversation is created",
                    "CONVERSATION_ASSIGNED": "A conversation is assigned to you",
                    "CONVERSATION_MENTION": "You are mentioned in a conversation",
                    "ASSIGNED_CONVERSATION_NEW_MESSAGE": "A new message is created in an assigned conversation",
                    "PARTICIPATING_CONVERSATION_NEW_MESSAGE": "A new message is created in a participating conversation",
                    "SLA_MISSED_FIRST_RESPONSE": "A conversation misses first response SLA",
                    "SLA_MISSED_NEXT_RESPONSE": "A conversation misses next response SLA",
                    "SLA_MISSED_RESOLUTION": "A conversation misses resolution SLA"
                },
                "BROWSER_PERMISSION": "Enable push notifications for your browser so you’re able to receive them",
                "PUSH_ENABLE_FAILED": "Could not turn on push notifications in this browser. Please try again later.",
                "PUSH_SERVICE_BLOCKED_BRAVE": "Brave has its push messaging service turned off. Open brave://settings/privacy, turn on \"Use Google services for push messaging\", restart Brave, then turn this on again.",
                "PUSH_SERVICE_UNAVAILABLE": "This browser has no push messaging service. Turn on notifications in Chrome, Edge, Cốc Cốc or Firefox instead.",
                "PUSH_PERMISSION_DENIED": "Notifications are blocked for this site. Allow them in your browser’s site settings, then turn this on again.",
                "PUSH_PERMISSION_REVOKED_BANNER": "This browser no longer lets Yona show notifications, so push notifications have stopped here.",
                "PUSH_PERMISSION_REVOKED_ENABLE": "Turn back on",
                "PUSH_PERMISSION_REVOKED_TURN_OFF": "Turn off push notifications",
                "SOUND": {
                    "TITLE": "Sound when a customer messages",
                    "NOTE": "Plays a sound for new messages while Yona is open in your browser.",
                    "SCOPE": "Play for",
                    "SCOPE_ALL": "Every new message",
                    "SCOPE_ASSIGNED": "Only conversations assigned to me",
                    "ONLY_WHEN_HIDDEN": "Only when I am not looking at Yona",
                    "ONLY_WHEN_HIDDEN_NOTE": "No sound while a Yona tab is in front of you. With several tabs open, only one plays."
                }
            },
            "API": {
                "UPDATE_SUCCESS": "Your notification preferences are updated successfully",
                "UPDATE_ERROR": "There is an error while updating the preferences, please try again"
            },
            "PUSH_NOTIFICATIONS_SECTION": {
                "TITLE": "Push Notifications",
                "NOTE": "Update your push notification preferences here",
                "CONVERSATION_ASSIGNMENT": "Send push notifications when a conversation is assigned to me",
                "CONVERSATION_CREATION": "Send push notifications when a new conversation is created",
                "CONVERSATION_MENTION": "Send push notifications when you are mentioned in a conversation",
                "ASSIGNED_CONVERSATION_NEW_MESSAGE": "Send push notifications when a new message is created in an assigned conversation",
                "PARTICIPATING_CONVERSATION_NEW_MESSAGE": "Send push notifications when a new message is created in a participating conversation",
                "HAS_ENABLED_PUSH": "You have enabled push for this browser.",
                "REQUEST_PUSH": "Enable push notifications",
                "SLA_MISSED_FIRST_RESPONSE": "Send push notifications when a conversation misses first response SLA",
                "SLA_MISSED_NEXT_RESPONSE": "Send push notifications when a conversation misses next response SLA",
                "SLA_MISSED_RESOLUTION": "Send push notifications when a conversation misses resolution SLA"
            },
            "PROFILE_IMAGE": {
                "LABEL": "Profile Image"
            },
            "NAME": {
                "LABEL": "Your full name",
                "ERROR": "Please enter a valid full name",
                "PLACEHOLDER": "Please enter your full name"
            },
            "DISPLAY_NAME": {
                "LABEL": "Display name",
                "ERROR": "Please enter a valid display name",
                "PLACEHOLDER": "Please enter a display name, this would be displayed in conversations"
            },
            "AVAILABILITY": {
                "LABEL": "Availability",
                "STATUS": {
                    "ONLINE": "Online",
                    "BUSY": "Busy",
                    "OFFLINE": "Offline"
                },
                "SET_AVAILABILITY_SUCCESS": "Availability has been set successfully",
                "SET_AVAILABILITY_ERROR": "Couldn't set availability, please try again",
                "IMPERSONATING_ERROR": "Cannot change availability while impersonating a user"
            },
            "EMAIL": {
                "LABEL": "Your email address",
                "ERROR": "Please enter a valid email address",
                "PLACEHOLDER": "Please enter your email address, this would be displayed in conversations"
            },
            "CURRENT_PASSWORD": {
                "LABEL": "Current password",
                "ERROR": "Please enter the current password",
                "PLACEHOLDER": "Please enter the current password"
            },
            "PASSWORD": {
                "LABEL": "New password",
                "ERROR": "Please enter a password of length 6 or more",
                "PLACEHOLDER": "Please enter a new password"
            },
            "PASSWORD_CONFIRMATION": {
                "LABEL": "Confirm new password",
                "ERROR": "Confirm password should match the password",
                "PLACEHOLDER": "Please re-enter your new password"
            }
        }
    },
    "PUBLIC_PORTAL": {
        "search": {
            "search_placeholder": "Search for article by title or body...",
            "empty_placeholder": "No results found.",
            "loading_placeholder": "Searching...",
            "results_title": "Search results",
            "results": "Search Results",
            "results_for": "Search Results for ':query'",
            "no_results": "No results found for ':query'",
            "found_results": "Found 1 result|Found :count results",
            "submit": "Search"
        },
        "toc_header": "On this page",
        "sidebar": {
            "help_center": "Help Center",
            "categories": "Categories",
            "language": "Language",
            "theme": "Theme",
            "open_sidebar": "Open sidebar",
            "close_sidebar": "Close sidebar",
            "browse": "Browse",
            "back_to_category": "Back to :name",
            "browse_by_topic": "Browse by topic",
            "browse_by_topic_subtitle": "Find guides, tutorials, and answers organised by category.",
            "popular_articles": "Popular articles",
            "popular_articles_subtitle": "What other people are reading right now.",
            "recommended": "Recommended articles",
            "recommended_subtitle": "Hand-picked articles to get you started.",
            "popular_label": "Popular topics:",
            "recommended_label": "Recommended topics:",
            "authors_others": ":names and :count others",
            "primary_nav": "Primary"
        },
        "hero": {
            "sub_title": "Search for the articles here or browse the categories below."
        },
        "common": {
            "home": "Home",
            "last_updated_on": "Last updated on :last_updated_on",
            "view_all_articles": "View all",
            "article": "article",
            "articles": "articles",
            "author": "author",
            "authors": "authors",
            "other": "other",
            "others": "others",
            "by": "By",
            "no_articles": "There are no articles here",
            "previous": "Previous",
            "next": "Next"
        },
        "article_actions": {
            "label": "Open in",
            "view_markdown": "View as Markdown",
            "open_in_chatgpt": "Open in ChatGPT",
            "open_in_claude": "Open in Claude",
            "llm_prompt": "Read the following article and help me understand it: :url"
        },
        "footer": {
            "made_with": "Made with"
        },
        "header": {
            "go_to_homepage": "Website",
            "visit_website": "Visit website",
            "language": "Language",
            "featured_articles": "Featured Articles",
            "recommended": "Recommended articles",
            "uncategorized": "Uncategorized"
        },
        "404": {
            "title": "Page not found",
            "description": "We couldn't find the page you were looking for.",
            "back_to_home": "Go to home page"
        },
        "not_active": {
            "title": "Help Center Unavailable",
            "description": "Please contact the site administrator for more information.",
            "action": "If you are the administrator, please upgrade your plan to restore access."
        }
    },
    "REGISTER": {
        "TRY_WOOT": "Create an account",
        "GET_STARTED": "Get started with {installationName}",
        "TITLE": "Register",
        "TESTIMONIAL_HEADER": "All it takes is one step to move forward",
        "TESTIMONIAL_CONTENT": "You're one step away from engaging your customers, retaining them and finding new ones.",
        "TERMS_ACCEPT": "By creating an account, you agree to our <a href=\"{termsURL}\">T & C</a> and <a href=\"{privacyURL}\">Privacy policy</a>",
        "OAUTH": {
            "GOOGLE_SIGNUP": "Sign up with Google"
        },
        "COMPANY_NAME": {
            "LABEL": "Company name",
            "PLACEHOLDER": "Enter your company name. E.g., Wayne Enterprises",
            "ERROR": "Company name is too short."
        },
        "FULL_NAME": {
            "LABEL": "Full name",
            "PLACEHOLDER": "Enter your full name. E.g., Bruce Wayne",
            "ERROR": "Full name is too short."
        },
        "EMAIL": {
            "LABEL": "Work email",
            "PLACEHOLDER": "Enter your work email address. E.g., bruce@wayne.enterprises",
            "ERROR": "Please enter a valid work email address."
        },
        "PASSWORD": {
            "LABEL": "Password",
            "PLACEHOLDER": "Password",
            "ERROR": "Password is too short.",
            "IS_INVALID_PASSWORD": "Password should contain atleast 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character.",
            "REQUIREMENTS_LENGTH": "At least 6 characters long",
            "REQUIREMENTS_UPPERCASE": "At least one uppercase letter",
            "REQUIREMENTS_LOWERCASE": "At least one lowercase letter",
            "REQUIREMENTS_NUMBER": "At least one number",
            "REQUIREMENTS_SPECIAL": "At least one special character"
        },
        "CONFIRM_PASSWORD": {
            "LABEL": "Confirm password",
            "PLACEHOLDER": "Confirm password",
            "ERROR": "Passwords do not match."
        },
        "API": {
            "SUCCESS_MESSAGE": "Registration Successful",
            "ERROR_MESSAGE": "Could not connect to the server. Please try again."
        },
        "SUBMIT": "Create account",
        "HAVE_AN_ACCOUNT": "Already have an account?",
        "VERIFY_EMAIL": {
            "TITLE": "Check your inbox",
            "DESCRIPTION": "We sent a verification link to {email}. Click the link to verify your email and get started.",
            "RESEND": "Resend verification email",
            "RESEND_SUCCESS": "Verification email sent. Please check your inbox.",
            "RESEND_ERROR": "Could not send verification email. Please try again."
        }
    },
    "REPORT": {
        "HEADER": "Conversations",
        "LOADING_CHART": "Loading chart data...",
        "NO_ENOUGH_DATA": "We've not received enough data points to generate report, Please try again later.",
        "DOWNLOAD_CONVERSATION_REPORTS": "Download conversation reports",
        "DATA_FETCHING_FAILED": "Failed to fetch data, please try again later.",
        "SUMMARY_FETCHING_FAILED": "Failed to fetch summary, please try again later.",
        "METRICS": {
            "CONVERSATIONS": {
                "NAME": "Conversations",
                "DESC": "( Total )"
            },
            "INCOMING_MESSAGES": {
                "NAME": "Messages received",
                "DESC": "( Total )"
            },
            "OUTGOING_MESSAGES": {
                "NAME": "Messages sent",
                "DESC": "( Total )"
            },
            "FIRST_RESPONSE_TIME": {
                "NAME": "First Response Time",
                "DESC": "( Avg )",
                "INFO_TEXT": "Total number of conversations used for computation:",
                "TOOLTIP_DESCRIPTION": "Based on {count} conversation | Based on {count} conversations",
                "TOOLTIP_TEXT": "First Response Time is {metricValue} (based on {conversationCount} conversations)"
            },
            "RESOLUTION_TIME": {
                "NAME": "Resolution Time",
                "DESC": "( Avg )",
                "INFO_TEXT": "Total number of conversations used for computation:",
                "TOOLTIP_DESCRIPTION": "Based on {count} conversation | Based on {count} conversations",
                "TOOLTIP_TEXT": "Resolution Time is {metricValue} (based on {conversationCount} conversations)"
            },
            "RESOLUTION_COUNT": {
                "NAME": "Resolution Count",
                "DESC": "( Total )"
            },
            "BOT_RESOLUTION_COUNT": {
                "NAME": "Resolution Count",
                "DESC": "( Total )"
            },
            "BOT_HANDOFF_COUNT": {
                "NAME": "Handoff Count",
                "DESC": "( Total )"
            },
            "REPLY_TIME": {
                "NAME": "Customer waiting time",
                "TOOLTIP_LABEL": "Waiting time",
                "TOOLTIP_DESCRIPTION": "Based on {count} reply | Based on {count} replies",
                "TOOLTIP_TEXT": "Waiting time is {metricValue} (based on {conversationCount} replies)",
                "DESC": ""
            }
        },
        "DATE_RANGE_OPTIONS": {
            "LAST_7_DAYS": "Last 7 days",
            "LAST_14_DAYS": "Last 14 days",
            "LAST_30_DAYS": "Last 30 days",
            "THIS_MONTH": "This month",
            "LAST_MONTH": "Last month",
            "LAST_3_MONTHS": "Last 3 months",
            "LAST_6_MONTHS": "Last 6 months",
            "LAST_YEAR": "Last year",
            "CUSTOM_DATE_RANGE": "Custom date range"
        },
        "CUSTOM_DATE_RANGE": {
            "CONFIRM": "Apply",
            "PLACEHOLDER": "Select date range"
        },
        "GROUP_BY_FILTER_DROPDOWN_LABEL": "Group By",
        "DURATION_FILTER_LABEL": "Duration",
        "GROUPING_OPTIONS": {
            "DAY": "Day",
            "WEEK": "Week",
            "MONTH": "Month",
            "YEAR": "Year"
        },
        "BUSINESS_HOURS": "Business Hours",
        "FILTER_ACTIONS": {
            "CLEAR_FILTER": "Clear filter",
            "EMPTY_LIST": "No results found"
        },
        "DRILLDOWN": {
            "TITLE": "{metric} details",
            "RESULT_COUNT_CONVERSATION": "{count} conversation | {count} conversations",
            "RESULT_COUNT_MESSAGE": "{count} message | {count} messages",
            "EMPTY": "No records found for this bar.",
            "ERROR": "Could not load records. Please try again.",
            "ADMIN_ONLY": "Only administrators can drill down into report records.",
            "LOAD_MORE": "Load more",
            "PREVIOUS_BUCKET": "Previous bar",
            "NEXT_BUCKET": "Next bar",
            "UNKNOWN_CONTACT": "Unknown contact",
            "UNKNOWN_INBOX": "Unknown inbox",
            "UNASSIGNED_AGENT": "Unassigned",
            "NO_MESSAGE_CONTENT": "No message content",
            "MESSAGE_CREATED_AT": "Message created at {time}",
            "EVENT_OCCURRED_AT": "Event occurred at {time}",
            "INCOMING_MESSAGE": "Incoming message",
            "OUTGOING_MESSAGE": "Outgoing message"
        },
        "PAGINATION": {
            "RESULTS": "Showing {start} to {end} of {total} results",
            "PER_PAGE_TEMPLATE": "{size} / page"
        }
    },
    "REPORTS": {
        "period": "Reporting period :since to :until",
        "utc_warning": "The report generated is in UTC timezone",
        "agent_csv": {
            "agent_name": "Agent name",
            "conversations_count": "Assigned conversations",
            "avg_first_response_time": "Avg first response time",
            "avg_resolution_time": "Avg resolution time",
            "resolution_count": "Resolution Count",
            "avg_customer_waiting_time": "Avg customer waiting time"
        },
        "inbox_csv": {
            "inbox_name": "Inbox name",
            "inbox_type": "Inbox type",
            "conversations_count": "No. of conversations",
            "avg_first_response_time": "Avg first response time",
            "avg_resolution_time": "Avg resolution time"
        },
        "label_csv": {
            "label_title": "Label",
            "conversations_count": "No. of conversations",
            "avg_first_response_time": "Avg first response time",
            "avg_resolution_time": "Avg resolution time",
            "avg_reply_time": "Avg reply time",
            "resolution_count": "Resolution Count"
        },
        "team_csv": {
            "team_name": "Team name",
            "conversations_count": "Conversations count",
            "avg_first_response_time": "Avg first response time",
            "avg_resolution_time": "Avg resolution time",
            "resolution_count": "Resolution Count",
            "avg_customer_waiting_time": "Avg customer waiting time"
        },
        "conversation_csv": {
            "conversations_count": "Conversations",
            "incoming_messages_count": "Messages received",
            "outgoing_messages_count": "Messages sent",
            "avg_first_response_time": "Avg first response time",
            "avg_resolution_time": "Avg resolution time",
            "resolution_count": "Resolution count",
            "avg_customer_waiting_time": "Avg customer waiting time"
        },
        "conversation_traffic_csv": {
            "timezone": "Timezone"
        },
        "default_group_by": "day",
        "csat": {
            "headers": {
                "contact_name": "Contact Name",
                "contact_email_address": "Contact Email Address",
                "contact_phone_number": "Contact Phone Number",
                "link_to_the_conversation": "Link to the conversation",
                "agent_name": "Agent Name",
                "rating": "Rating",
                "feedback": "Feedback Comment",
                "recorded_at": "Recorded date"
            }
        }
    },
    "RESET_PASSWORD": {
        "TITLE": "Reset password",
        "DESCRIPTION": "Enter the email address you use to log in to {installationName} to get the password reset instructions.",
        "GO_BACK_TO_LOGIN": "If you want to go back to the login page,",
        "EMAIL": {
            "LABEL": "Email",
            "PLACEHOLDER": "Please enter your email.",
            "ERROR": "Please enter a valid email."
        },
        "API": {
            "SUCCESS_MESSAGE": "Password reset link has been sent to your email.",
            "ERROR_MESSAGE": "Could not connect to the server. Please try again."
        },
        "SUBMIT": "Submit"
    },
    "SEARCH": {
        "TABS": {
            "ALL": "All results",
            "CONTACTS": "People",
            "CONVERSATIONS": "Conversations",
            "MESSAGES": "Messages",
            "FILES": "Files",
            "ARTICLES": "Articles"
        },
        "SECTION": {
            "CONTACTS": "People",
            "CONVERSATIONS": "Conversations",
            "MESSAGES": "Messages",
            "FILES": "Files",
            "ARTICLES": "Articles"
        },
        "VIEW_MORE": "View more",
        "LOAD_MORE": "Load more",
        "SEARCHING_DATA": "Searching",
        "LOADING_DATA": "Loading",
        "EMPTY_STATE": "No {item} found for query '{query}'",
        "EMPTY_STATE_FULL": "No results found for query '{query}'",
        "PLACEHOLDER_KEYBINDING": "/to focus",
        "INPUT_PLACEHOLDER": "Type 3 or more characters to search",
        "RECENT_SEARCHES": "Recent searches",
        "CLEAR_ALL": "Clear all",
        "MOST_RECENT": "Most recent",
        "EMPTY_STATE_DEFAULT": "Search by customer name, group name, phone number, conversation ID, message text or file name.",
        "BOT_LABEL": "Bot",
        "READ_MORE": "Read more",
        "READ_LESS": "Read less",
        "WROTE": "wrote:",
        "FROM": "From",
        "EMAIL": "Email",
        "EMAIL_SUBJECT": "Subject",
        "PRIVATE": "Private note",
        "MATCHED_MEMBER": "Member",
        "OPEN_FILE": "Open file",
        "UNTITLED_FILE": "Untitled file",
        "TRANSCRIPT": "Transcript",
        "CREATED_AT": "created {time}",
        "UPDATED_AT": "updated {time}",
        "SORT_BY": {
            "RELEVANCE": "Relevance"
        },
        "DATE_RANGE": {
            "LAST_7_DAYS": "Last 7 days",
            "LAST_30_DAYS": "Last 30 days",
            "LAST_60_DAYS": "Last 60 days",
            "LAST_90_DAYS": "Last 90 days",
            "CUSTOM_RANGE": "Custom range:",
            "CREATED_BETWEEN": "Created between",
            "AND": "and",
            "APPLY": "Apply",
            "BEFORE_DATE": "Before {date}",
            "AFTER_DATE": "After {date}",
            "TIME_RANGE": "Filter by time",
            "CLEAR_FILTER": "Clear filter"
        },
        "FILTERS": {
            "FILTER_MESSAGE": "Filter messages by:",
            "FROM": "Sender",
            "IN": "Inbox",
            "AGENTS": "Agents",
            "CONTACTS": "People",
            "INBOXES": "Inboxes",
            "NO_AGENTS": "No agents found",
            "NO_CONTACTS": "Start by searching to see results",
            "NO_INBOXES": "No inboxes found"
        }
    },
    "SECURITY_SETTINGS": {
        "TITLE": "Security",
        "DESCRIPTION": "Manage your account security settings.",
        "LINK_TEXT": "Learn more about SAML SSO",
        "SAML_DISABLED_MESSAGE": "SAML SSO is currently disabled. Please contact your administrator to enable this feature.",
        "SAML": {
            "TITLE": "SAML SSO",
            "NOTE": "Configure SAML single sign-on for your account. Users will authenticate through your identity provider instead of using email/password.",
            "ACS_URL": {
                "LABEL": "ACS URL",
                "TOOLTIP": "Assertion Consumer Service URL - Configure this URL in your IdP as the destination for SAML responses"
            },
            "SSO_URL": {
                "LABEL": "SSO URL",
                "HELP": "The URL where SAML authentication requests will be sent",
                "PLACEHOLDER": "https://sso.example.com/saml/sso"
            },
            "CERTIFICATE": {
                "LABEL": "Signing certificate in PEM format",
                "HELP": "The public certificate from your identity provider used to verify SAML responses",
                "PLACEHOLDER": "-----BEGIN CERTIFICATE-----\nMIIC..."
            },
            "FINGERPRINT": {
                "LABEL": "Fingerprint",
                "TOOLTIP": "SHA-1 fingerprint of the certificate - Use this to verify the certificate in your IdP configuration"
            },
            "COPY_SUCCESS": "Copied to clipboard",
            "SP_ENTITY_ID": {
                "LABEL": "SP Entity ID",
                "HELP": "Unique identifier for this application as a service provider (auto-generated).",
                "TOOLTIP": "Unique identifier for {installationName} as the Service Provider - Configure this in your IdP settings"
            },
            "IDP_ENTITY_ID": {
                "LABEL": "Identity Provider Entity ID",
                "HELP": "Unique identifier for your identity provider (usually found in IdP configuration)",
                "PLACEHOLDER": "https://sso.example.com/saml"
            },
            "UPDATE_BUTTON": "Update SAML Settings",
            "API": {
                "SUCCESS": "SAML settings updated successfully",
                "ERROR": "Failed to update SAML settings",
                "ERROR_LOADING": "Failed to load SAML settings",
                "DISABLED": "SAML settings disabled successfully"
            },
            "VALIDATION": {
                "REQUIRED_FIELDS": "SSO URL, Identity Provider Entity ID, and Certificate are required fields",
                "SSO_URL_ERROR": "Please enter a valid SSO URL",
                "CERTIFICATE_ERROR": "Certificate is required",
                "IDP_ENTITY_ID_ERROR": "Identity Provider Entity ID is required"
            },
            "ENTERPRISE_PAYWALL": {
                "AVAILABLE_ON": "The SAML SSO feature is only available in the Enterprise plans.",
                "UPGRADE_PROMPT": "Upgrade to an Enterprise plan to access SAML single sign-on and other advanced security features.",
                "ASK_ADMIN": "Please reach out to your administrator for the upgrade."
            },
            "PAYWALL": {
                "TITLE": "Upgrade to enable SAML SSO",
                "AVAILABLE_ON": "The SAML SSO feature is only available in the Enterprise plans.",
                "UPGRADE_PROMPT": "Upgrade your plan to get access to SAML single sign-on and other advanced features.",
                "UPGRADE_NOW": "Upgrade now",
                "CANCEL_ANYTIME": "You can change or cancel your plan anytime"
            },
            "ATTRIBUTE_MAPPING": {
                "TITLE": "SAML Attribute Setup",
                "DESCRIPTION": "The following attribute mappings must be configured in your identity provider"
            },
            "INFO_SECTION": {
                "TITLE": "Service Provider Information",
                "TOOLTIP": "Copy these values and configure them in your Identity Provider to establish the SAML connection"
            }
        }
    },
    "SESSION_LIMIT": {
        "TITLE": "Active session limit reached",
        "DESCRIPTION": "You have reached your limit of active sessions. Please end a session before logging in.",
        "END": "End",
        "END_ALL": "End all sessions",
        "LOG_IN": "Log in",
        "CANCEL": "Back to login",
        "UNKNOWN_DEVICE": "Unknown device",
        "STARTED": "Started"
    },
    "SET_NEW_PASSWORD": {
        "TITLE": "Set new password",
        "PASSWORD": {
            "LABEL": "Password",
            "PLACEHOLDER": "Password",
            "ERROR": "Password is too short."
        },
        "CONFIRM_PASSWORD": {
            "LABEL": "Confirm password",
            "PLACEHOLDER": "Confirm Password",
            "ERROR": "Passwords do not match."
        },
        "API": {
            "SUCCESS_MESSAGE": "Successfully changed the password.",
            "ERROR_MESSAGE": "Could not connect to the server. Please try again."
        },
        "CAPTCHA": {
            "ERROR": "Verification expired. Please solve captcha again."
        },
        "SUBMIT": "Submit"
    },
    "SETTINGS": {
        "INBOXES": {
            "NEW_INBOX": "Add Inbox"
        }
    },
    "SETTINGS_DRAFT": {
        "UNSAVED": "Unsaved changes",
        "CANCEL": "Cancel",
        "SAVE": "Save changes",
        "CONFIRM_LEAVE": "Leaving will discard your unsaved changes. Leave anyway?"
    },
    "SIDEBAR": {
        "NO_ITEMS": "No items",
        "GLOBAL_SEARCH": "Search",
        "GLOBAL_SEARCH_HINT": "Open the command bar: find features, jump to pages, switch theme",
        "CURRENTLY_VIEWING_ACCOUNT": "Currently viewing:",
        "SWITCH": "Switch",
        "INBOX_VIEW": "Inbox View",
        "COMPACT_INBOX": "Inbox",
        "COMPACT_CONTACTS": "Friends",
        "CONVERSATIONS": "Conversations",
        "INBOX": "My Inbox",
        "ALL_CONVERSATIONS": "All Conversations",
        "MENTIONED_CONVERSATIONS": "Mentions",
        "PARTICIPATING_CONVERSATIONS": "Participating",
        "UNATTENDED_CONVERSATIONS": "Unattended",
        "REPORTS": "Reports",
        "SETTINGS": "Settings",
        "CONTACTS": "Friends",
        "ACTIVE": "Active",
        "COMPANIES": "Companies",
        "ALL_COMPANIES": "All Companies",
        "CAPTAIN": "Captain",
        "CALLS": "Calls",
        "CAPTAIN_ASSISTANTS": "Assistants",
        "CAPTAIN_OVERVIEW": "Overview",
        "CAPTAIN_DOCUMENTS": "Documents",
        "CAPTAIN_RESPONSES": "FAQs",
        "CAPTAIN_TOOLS": "Tools",
        "CAPTAIN_SCENARIOS": "Scenarios",
        "CAPTAIN_PLAYGROUND": "Playground",
        "CAPTAIN_INBOXES": "Inboxes",
        "CAPTAIN_SETTINGS": "Settings",
        "HOME": "Home",
        "AGENTS": "Agents",
        "AGENT_BOTS": "Bots",
        "AUDIT_LOGS": "Audit Logs",
        "INBOXES": "Inboxes",
        "WHATSAPP_TEMPLATES": "Templates",
        "NOTIFICATIONS": "Notifications",
        "CANNED_RESPONSES": "Canned Responses",
        "INTEGRATIONS": "Integrations",
        "DATA": "Data",
        "PROFILE_SETTINGS": "Profile Settings",
        "ACCOUNT_SETTINGS": "Account Settings",
        "APPLICATIONS": "Applications",
        "LABELS": "Labels",
        "WIDGET_UPDATES": "Widget updates",
        "PAYMENT_ACCOUNTS": "Bank transfer",
        "CUSTOM_ATTRIBUTES": "Custom Attributes",
        "AUTOMATION": "Automation",
        "MACROS": "Macros",
        "TEAMS": "Teams",
        "BILLING": "Billing",
        "CUSTOM_VIEWS_FOLDER": "Folders",
        "CUSTOM_VIEWS_SEGMENTS": "Segments",
        "ALL_CONTACTS": "All friends",
        "TAGGED_WITH": "Tagged with",
        "NEW_LABEL": "New label",
        "NEW_TEAM": "New team",
        "NEW_INBOX": "New inbox",
        "REPORTS_CONVERSATION": "Conversations",
        "CSAT": "CSAT",
        "LIVE_CHAT": "Live Chat",
        "SMS": "SMS",
        "WHATSAPP": "WhatsApp",
        "CAMPAIGNS": "Campaigns",
        "ONGOING": "Ongoing",
        "ONE_OFF": "One off",
        "REPORTS_SLA": "SLA",
        "REPORTS_BOT": "Bot",
        "REPORTS_AGENT": "Agents",
        "REPORTS_LABEL": "Labels",
        "REPORTS_INBOX": "Inbox",
        "REPORTS_TEAM": "Team",
        "AGENT_ASSIGNMENT": "Agent Assignment",
        "SET_AVAILABILITY_TITLE": "Set yourself as",
        "SET_YOUR_AVAILABILITY": "Set your availability",
        "SLA": "SLA",
        "CUSTOM_ROLES": "Custom Roles",
        "BETA": "Beta",
        "REPORTS_OVERVIEW": "Overview",
        "REAUTHORIZE": "Your inbox connection has expired, please reconnect\n to continue receiving and sending messages",
        "HELP_CENTER": {
            "TITLE": "Help Center",
            "ARTICLES": "Articles",
            "CATEGORIES": "Categories",
            "LOCALES": "Locales",
            "SETTINGS": "Settings"
        },
        "CHANNELS": "Channels",
        "CHANNEL_PREFERENCES": {
            "ARRANGE": "Arrange channels",
            "DONE": "Done",
            "DRAG": "Drag to reorder",
            "RENAME": "Rename for display",
            "HIDE": "Hide from sidebar",
            "SHOW": "Show channel"
        },
        "SET_AUTO_OFFLINE": {
            "TEXT": "Mark offline automatically",
            "INFO_TEXT": "Let the system automatically mark you offline when you aren't using the app or dashboard.",
            "INFO_SHORT": "Automatically mark offline when you aren't using the app."
        },
        "SORT_TOOLTIP": "Sort",
        "SORT_BY": "Sort by",
        "SORT_GROUPS": {
            "CREATED": "Sort by date of creation",
            "ALPHABETICAL": "Sort in alphabetical order",
            "UNREAD_COUNT": "Sort by unread count"
        },
        "SORT_OPTIONS": {
            "CREATED_DESC": "Newest first",
            "CREATED_ASC": "Oldest first",
            "ALPHABETICAL_ASC": "Ascending (A - Z)",
            "ALPHABETICAL_DESC": "Descending (Z - A)",
            "UNREAD_COUNT_DESC": "Highest first",
            "UNREAD_COUNT_ASC": "Lowest first"
        },
        "DOCS": "Read docs",
        "SECURITY": "Security",
        "CAPTAIN_AI": "Captain",
        "CONVERSATION_WORKFLOW": "Conversation Workflow"
    },
    "SIDEBAR_ITEMS": {
        "CHANGE_AVAILABILITY_STATUS": "Change",
        "CHANGE_ACCOUNTS": "Switch account",
        "SWITCH_ACCOUNT": "Switch account",
        "CONTACT_SUPPORT": "Contact support",
        "SELECTOR_SUBTITLE": "Select an account from the following list",
        "PROFILE_SETTINGS": "Profile settings",
        "YEAR_IN_REVIEW": "Year in Review",
        "KEYBOARD_SHORTCUTS": "Keyboard shortcuts",
        "LANGUAGE": "Language",
        "LANGUAGE_ACCOUNT_DEFAULT": "Account default",
        "APPEARANCE": "Appearance",
        "SUPER_ADMIN_CONSOLE": "SuperAdmin console",
        "DOCS": "Read documentation",
        "CHANGELOG": "Changelog",
        "LOGOUT": "Log out",
        "SETTINGS_SCREEN": {
            "TITLE": "Settings",
            "EDIT_PROFILE": "Edit profile",
            "SEARCH": "Search",
            "PREFERENCES": "Preferences",
            "ACCOUNT_GROUP": "Account",
            "MY_PROFILE": "My profile",
            "INBOX_GROUP": "Inbox",
            "CLOSE": "Close",
            "MENU": "Settings menu",
            "NO_MATCH": "Nothing matches."
        }
    },
    "SLACK_UNFURL": {
        "fields": {
            "name": "Name",
            "email": "Email",
            "phone_number": "Phone",
            "company_name": "Company",
            "inbox_name": "Inbox",
            "inbox_type": "Inbox Type"
        },
        "button": "Open conversation"
    },
    "SLASH_COMMANDS": {
        "HEADING_1": "Heading 1",
        "HEADING_2": "Heading 2",
        "HEADING_3": "Heading 3",
        "BOLD": "Bold",
        "ITALIC": "Italic",
        "STRIKETHROUGH": "Strikethrough",
        "CODE": "Code",
        "BULLET_LIST": "Bullet List",
        "ORDERED_LIST": "Ordered List",
        "TABLE": "Table",
        "IMAGE": "Image",
        "VIDEO": "Video",
        "DIVIDER": "Divider"
    },
    "STICKER_LIBRARY": {
        "MENU": "Sticker library",
        "SUPER_ADMIN_HEADER": "Shared sticker library",
        "SUPER_ADMIN_DESCRIPTION": "Published packs are visible to every account.",
        "PAGE_HEADER": "Sticker library",
        "PAGE_DESCRIPTION": "Published packs appear in this account's inboxes and widget.",
        "PLATFORM_DESCRIPTION": "The shared Yona library: published packs show in every account.",
        "PAGE_INFO": "External channels such as Zalo receive a static PNG. Large images are shrunk automatically; GIFs keep their animation inside Yona.",
        "INFO_LABEL": "More info",
        "TABS": {
            "ACCOUNT": "Account library",
            "PLATFORM": "Platform library"
        },
        "LOADING": "Loading sticker library…",
        "LOAD_ERROR": "Could not load the sticker library",
        "REFRESH_FAILED": "Could not refresh",
        "RETRY": "Retry",
        "DISMISS": "Dismiss",
        "CLOSE": "Close",
        "BACK": "Back",
        "CANCEL": "Cancel",
        "SAVE": "Save",
        "SAVED": "Saved",
        "UNDO": "Undo",
        "ACTION_ERROR": "Something went wrong, please try again.",
        "EMPTY_TITLE": "No sticker packs yet",
        "CREATE_FIRST": "Create the first pack",
        "PACKS_HEADING": "Sticker packs ({count})",
        "NEW_PACK": "New pack",
        "NEW_PACK_PLACEHOLDER": "New pack name",
        "CREATE": "Create",
        "DUPLICATE_PACK_NAME": "A pack with this name already exists",
        "PACK_NAME_LABEL": "Pack name",
        "STICKERS_COUNT": "{count} sticker | {count} stickers",
        "PUBLISHED": "Published",
        "DRAFT": "Draft",
        "PUBLISH": "Publish",
        "PUBLISH_NEEDS_STICKER": "Add at least 1 sticker to publish",
        "PUBLISHED_TOAST": "Published “{name}” · now in inboxes and widget",
        "UNPUBLISHED_TOAST": "Moved back to draft",
        "PACK_MENU": "Pack options",
        "RENAME": "Rename",
        "RENAMED": "Renamed",
        "SORT": "Reorder",
        "SORT_DONE": "Done",
        "SORT_HINT": "Press and hold a tile, then drag to move it.",
        "FAILED_FIRST": "Move failed stickers to the top",
        "DELETE_PACK": "Delete pack",
        "DELETE_PACK_CONFIRM": "Delete pack “{name}” and its {count} sticker? This cannot be undone. | Delete pack “{name}” and its {count} stickers? This cannot be undone.",
        "PACK_DELETED": "Deleted pack “{name}”",
        "MOVE_TO_ACCOUNT": {
            "MENU": "Move to account library",
            "TITLE": "Move pack to the account library?",
            "MESSAGE": "Pack “{name}” will live only in this account’s library, and other accounts will no longer see it. Messages already sent keep their sticker images.",
            "DONE": "Moved “{name}” to the account library"
        },
        "MOVE_TO_PLATFORM": {
            "MENU": "Move to platform library",
            "TITLE": "Move pack to the platform library?",
            "MESSAGE": "Pack “{name}” will leave this account’s library. If it is published, every account will see it. Messages already sent keep their sticker images.",
            "DONE": "Moved “{name}” to the platform library"
        },
        "OPEN_MOVED_PACK": "Open",
        "PACK_SUMMARY": "{count}/{max} stickers · PNG, JPG, WebP, GIF · {size}×{size} sticker",
        "UPLOAD_INFO": "Large images are shrunk before upload; animated images can be up to {limit}. External channels such as Zalo receive a static PNG.",
        "ADD_STICKER": "Add sticker",
        "ADD_SHORT": "Add",
        "DROP_HERE": "Drop to add to “{name}”",
        "EMPTY_PACK_DROP": "Drag images here or paste from the clipboard",
        "EMPTY_PACK_MOBILE": "Pick images to create stickers",
        "EMPTY_PACK_FORMATS": "PNG, JPG, WebP, GIF · {size}×{size} sticker",
        "CHOOSE_IMAGES": "Choose images",
        "UPLOAD_FAILED": "Could not save this sticker, please try again.",
        "FILES_REJECTED": "Skipped {count} file: {details}. | Skipped {count} files: {details}.",
        "REJECTED_FILE": "{filename} ({reason})",
        "REJECT_REASON": {
            "TYPE": "not a PNG, JPG, WebP or GIF image",
            "ANIMATED_TOO_LARGE": "animated image too heavy",
            "UNREADABLE": "image could not be read"
        },
        "STICKERS_ADDED": "Added {count} sticker | Added {count} stickers",
        "STICKERS_SKIPPED": "skipped {count}",
        "STICKERS_EXISTING": "{count} already in pack",
        "STICKERS_FAILED": "{count} failed",
        "DISCARD_QUEUE_TITLE": "Discard {count} unsaved image? | Discard {count} unsaved images?",
        "DISCARD_QUEUE_MESSAGE": "Stickers already saved are kept.",
        "KEEP_EDITING_IMAGES": "Keep editing",
        "DISCARD": "Discard",
        "EDITOR": {
            "TITLE": "Add sticker",
            "TITLE_WITH_POSITION": "Add sticker · Image {index}/{total}",
            "REEDIT_TITLE": "Edit sticker image",
            "CLOSE": "Close editor",
            "LOADING": "Opening image…",
            "LOAD_FAILED": "Could not read this image. Skip it and pick another one.",
            "PROCESS_FAILED": "Could not process this image.",
            "ANIMATION_UNAVAILABLE": "This browser cannot preview animations: showing the first frame, the sticker keeps its animation.",
            "STAGE": "Image being edited",
            "CROP_FRAME": "Sticker area. Arrow keys move it, + and - resize it.",
            "TOOLS": "Tools",
            "TOOL_FRAMING": "Area",
            "TOOL_WAND": "Magic wand",
            "TOOL_BRUSH": "Brush",
            "FRAMING": "How to pick the area",
            "FRAMING_SUBJECT": "Hug subject",
            "FRAMING_FIT": "Fit whole image",
            "FRAMING_CUSTOM": "Custom",
            "HINT_SUBJECT": "The sticker centres whatever is kept.",
            "HINT_FIT": "The whole image sits in the square, the rest is transparent margin.",
            "HINT_CUSTOM": "Drag the frame or its corners. The frame is exactly the sticker and may extend past the image.",
            "HINT_WAND": "Tap a colour area to remove or keep the whole area.",
            "HINT_BRUSH": "Paint over the parts to remove or restore.",
            "WAND_MODE": "Magic wand mode",
            "WAND_REMOVE": "Remove",
            "WAND_KEEP": "Keep",
            "BRUSH_MODE": "Brush mode",
            "BRUSH_REMOVE": "Erase",
            "BRUSH_KEEP": "Restore",
            "BRUSH_SIZE": "Brush size",
            "BRUSH_SIZE_VALUE": "{size}%",
            "DECREASE": "Decrease {label}",
            "INCREASE": "Increase {label}",
            "REMOVE_BACKGROUND": "Remove background",
            "WHITE_STROKE": "White outline",
            "STROKE_WIDTH": "Thickness",
            "STROKE_HINT": "Remove the background to outline the subject.",
            "TOLERANCE": "Tolerance",
            "TOLERANCE_HINT": "Raise it to also remove colours close to the background. For busy backgrounds, touch up with the magic wand and brush.",
            "UNDO": "Undo",
            "REDO": "Redo",
            "USE_ORIGINAL": "Use original image",
            "EDIT_LIMIT": "This sticker has reached its edit limit. Undo some edits to keep going.",
            "PREVIEW": "Preview",
            "PREVIEW_ZOOMED": "Zoomed",
            "PREVIEW_ACTUAL": "Actual size {size}×{size}",
            "PLAY": "Play animation",
            "PAUSE": "Pause animation",
            "FRAME_OF": "Frame {index}/{total}",
            "EMPTY_RESULT": "Nothing is left after removing the background",
            "SETTINGS": "Sticker settings",
            "TAB_IMAGE": "Edit image",
            "TAB_DETAILS": "Name",
            "SKIP": "Skip this image",
            "CANCEL": "Cancel",
            "SAVE": "Save sticker",
            "SAVE_AND_NEXT": "Save and next ({index}/{total})",
            "SAVE_ALL": "Save all ({count} images left)",
            "BULK_PROGRESS": "Saving {done}/{total} images…",
            "SAVING": "Saving…",
            "WAITING_FOR_SERVER": "Waiting for the server… {seconds}s",
            "IMAGE_TOO_LARGE": "The image is still over the upload limit after shrinking. Crop it or pick another image.",
            "EXISTING": "This image is already in the pack (slot {slot}).",
            "EXISTING_LABELLED": "This image is already in the pack (slot {slot}, label “{label}”).",
            "UPDATE_EXISTING": "Update label and keywords of the existing sticker",
            "SKIP_EXISTING": "Skip",
            "QUEUE": "Image queue",
            "QUEUE_STATUS": {
                "PENDING": "waiting",
                "SAVING": "saving",
                "SAVED": "saved",
                "EXISTING": "already in pack",
                "SKIPPED": "skipped",
                "FAILED": "failed"
            },
            "REJECTED_STRIP": "{valid}/{total} images are valid · skipped {files}",
            "SUMMARY_ADDED": "Added {count}",
            "SUMMARY_SKIPPED": "Skipped {count}",
            "SUMMARY_REJECTED": "{count} invalid file | {count} invalid files",
            "SUMMARY_EXISTING": "{count} already in pack",
            "SUMMARY_FAILED": "{count} failed",
            "SUMMARY_FAILED_LIST": "Images that failed",
            "SUMMARY_FAILED_ITEM": "{name}: {error}",
            "DONE": "Done"
        },
        "GRID_LABEL": "Stickers in “{name}”",
        "STICKER_OPTION": "{label} · {count} keyword | {label} · {count} keywords",
        "STICKER_UNNAMED": "Sticker {index}",
        "NO_KEYWORDS_DOT": "No keywords yet, customers will have a hard time finding it",
        "ANIMATED_BADGE": "GIF",
        "STATUS": {
            "processing": "Processing",
            "ready": "Ready",
            "failed": "Failed"
        },
        "POLL_EXHAUSTED": "Not done yet · Retry",
        "STICKER_MENU": "Sticker options",
        "EDIT_STICKER": "Edit label and keywords",
        "REEDIT": "Edit image",
        "REEDIT_SAVED": "Saved, the sticker is being rebuilt",
        "REEDIT_FAILED": "The last image edit did not go through, the sticker keeps its previous image: {reason}",
        "REEDIT_NO_ORIGINAL": "This sticker no longer has its original image, please upload it again.",
        "MOVE_FIRST": "Move to top",
        "MOVE_LAST": "Move to bottom",
        "DELETE_STICKER": "Delete sticker",
        "DELETE_STICKER_CONFIRM": "Delete this sticker from “{name}”?",
        "STICKER_DELETED": "Sticker deleted",
        "REORDER_FAILED": "Could not save the order",
        "LIFTED": "Picked up {label}. Use arrow keys to move, Space to drop, Escape to cancel.",
        "MOVED_TO": "Moved to position {index} of {total}",
        "REORDER_CANCELLED": "Move cancelled",
        "DETAIL_TITLE": "Sticker details",
        "DETAIL_POSITION": "Tile {index}/{total}",
        "DETAIL_ANIMATED": "Animated · {frames} frames",
        "DETAIL_STATIC": "Still image",
        "DISCARD_CHANGES_TITLE": "Discard unsaved changes?",
        "DISCARD_CHANGES_MESSAGE": "Your label and keyword edits will not be saved.",
        "KEEP_EDITING": "Keep editing",
        "LABEL": "Label",
        "KEYWORDS": "Keywords",
        "KEYWORDS_PLACEHOLDER": "haha, thanks, hello",
        "KEYWORDS_HINT": "Customers typing these words see this sticker suggested (accents ignored).",
        "KEYWORD_CHIP_PLACEHOLDER": "Type and press Enter",
        "KEYWORDS_FULL": "Keyword limit reached",
        "REMOVE_KEYWORD": "Remove keyword {keyword}",
        "ERRORS": {
            "LABEL_TOO_LONG": "Label can be at most {max} characters",
            "TOO_MANY_KEYWORDS": "At most {max} keywords",
            "KEYWORD_TOO_LONG": "Keyword “{keyword}” is longer than {max} characters"
        }
    },
    "SUMMARY_REPORTS": {
        "INBOX": "Inbox",
        "AGENT": "Agent",
        "TEAM": "Team",
        "LABEL": "Label",
        "AVG_RESOLUTION_TIME": "Avg. Resolution Time",
        "AVG_FIRST_RESPONSE_TIME": "Avg. First Response Time",
        "AVG_REPLY_TIME": "Avg. Customer Waiting Time",
        "RESOLUTION_COUNT": "Resolution Count",
        "CONVERSATIONS": "No. of conversations"
    },
    "SUPER_ADMIN": {
        "account_suspension": {
            "categories": {
                "spam": "Spam",
                "non_payment": "Non-payment",
                "other": "Other"
            },
            "form": {
                "category": "Suspension category",
                "category_prompt": "Select a category",
                "reason": "Suspension reason",
                "reason_hint": "Enter a reason of up to 256 characters."
            },
            "history": {
                "suspended_at": "Suspended at",
                "category": "Category",
                "reason": "Reason",
                "empty": "No suspension history recorded."
            }
        },
        "users": {
            "resend_confirmation": {
                "button": "Resend confirmation email",
                "sent": "Confirmation email sent.",
                "already_confirmed": "User is already confirmed."
            }
        }
    },
    "SUPER_ADMIN_MFA": {
        "REQUIRED_TITLE": "Two-factor authentication required",
        "REQUIRED_DESCRIPTION": "{installationName} requires 2FA for the super admin console. Finish setup below to continue."
    },
    "SURVEY": {
        "DESCRIPTION": "Dear customer 👋, please take a few moments to share feedback about the conversation you had with {inboxName}.",
        "RATING": {
            "LABEL": "Rate your conversation",
            "SUCCESS_MESSAGE": "Thank you for submitting the rating"
        },
        "FEEDBACK": {
            "LABEL": "Do you have any thoughts you'd like to share?",
            "PLACEHOLDER": "Your feedback (optional)",
            "BUTTON_TEXT": "Submit feedback"
        },
        "API": {
            "SUCCESS_MESSAGE": "Survey updated successfully",
            "ERROR_MESSAGE": "Could not connect to the server. Please try again later."
        },
        "POWERED_BY": "Powered by {installationName}"
    },
    "SWITCH": {
        "TOGGLE": "Toggle switch"
    },
    "TEAM_REPORTS": {
        "HEADER": "Team Overview",
        "DESCRIPTION": "Get a snapshot of your team's performance with essential metrics, including conversations, response times, resolution times, and resolved cases. Click a team name for more details.",
        "LOADING_CHART": "Loading chart data...",
        "NO_ENOUGH_DATA": "We've not received enough data points to generate report, Please try again later.",
        "DOWNLOAD_TEAM_REPORTS": "Download team reports",
        "FILTER_DROPDOWN_LABEL": "Select Team",
        "FILTERS": {
            "ADD_FILTER": "Add filter",
            "CLEAR_ALL": "Clear all",
            "NO_FILTER": "No filters available",
            "INPUT_PLACEHOLDER": {
                "TEAMS": "Search teams"
            }
        },
        "METRICS": {
            "CONVERSATIONS": {
                "NAME": "Conversations",
                "DESC": "( Total )"
            },
            "INCOMING_MESSAGES": {
                "NAME": "Incoming Messages",
                "DESC": "( Total )"
            },
            "OUTGOING_MESSAGES": {
                "NAME": "Outgoing Messages",
                "DESC": "( Total )"
            },
            "FIRST_RESPONSE_TIME": {
                "NAME": "First Response Time",
                "DESC": "( Avg )",
                "INFO_TEXT": "Total number of conversations used for computation:",
                "TOOLTIP_TEXT": "First Response Time is {metricValue} (based on {conversationCount} conversations)"
            },
            "RESOLUTION_TIME": {
                "NAME": "Resolution Time",
                "DESC": "( Avg )",
                "INFO_TEXT": "Total number of conversations used for computation:",
                "TOOLTIP_TEXT": "Resolution Time is {metricValue} (based on {conversationCount} conversations)"
            },
            "RESOLUTION_COUNT": {
                "NAME": "Resolution Count",
                "DESC": "( Total )"
            }
        },
        "CUSTOM_DATE_RANGE": {
            "CONFIRM": "Apply",
            "PLACEHOLDER": "Select date range"
        }
    },
    "TEAMS_SETTINGS": {
        "NEW_TEAM": "Create new team",
        "HEADER": "Teams",
        "LOADING": "Fetching teams",
        "DESCRIPTION": "Teams allow you to organize agents into groups based on their responsibilities. An agent can belong to multiple teams. When working collaboratively, you can assign conversations to specific teams.",
        "LEARN_MORE": "Learn more about teams",
        "COUNT": "{n} team | {n} teams",
        "SEARCH_PLACEHOLDER": "Search teams...",
        "NO_RESULTS": "No teams found matching your search",
        "LIST": {
            "404": "There are no teams created on this account.",
            "EDIT_TEAM": "Edit team",
            "NONE": "None"
        },
        "CREATE_FLOW": {
            "CREATE": {
                "TITLE": "Create a new team",
                "DESC": "Add a title and description to your new team."
            },
            "AGENTS": {
                "BUTTON_TEXT": "Add agents to team",
                "TITLE": "Add agents to team - {teamName}",
                "DESC": "Add Agents to your newly created team. This lets you collaborate as a team on conversations, get notified on new events in the same conversation."
            },
            "WIZARD_CREATE": {
                "TITLE": "Create",
                "BODY": "Create a new team of agents."
            },
            "WIZARD_ADD_AGENTS": {
                "TITLE": "Add Agents",
                "BODY": "Add agents to the team."
            },
            "WIZARD_FINISH": {
                "TITLE": "Finish",
                "BODY": "You are all set to go!"
            }
        },
        "EDIT_FLOW": {
            "CREATE": {
                "TITLE": "Edit your team details",
                "DESC": "Edit title and description to your team.",
                "BUTTON_TEXT": "Update team"
            },
            "AGENTS": {
                "BUTTON_TEXT": "Update agents in team",
                "TITLE": "Add agents to team - {teamName}",
                "DESC": "Add Agents to your newly created team. All the added agents will be notified when a conversation is assigned to this team."
            },
            "EDIT_WIZARD_DETAILS": {
                "TITLE": "Team details",
                "ROUTE": "settings_teams_edit",
                "BODY": "Change name, description and other details."
            },
            "EDIT_WIZARD_AGENTS": {
                "TITLE": "Edit Agents",
                "ROUTE": "settings_teams_edit_members",
                "BODY": "Edit agents in your team."
            },
            "EDIT_WIZARD_FINISH": {
                "TITLE": "Finish",
                "ROUTE": "settings_teams_edit_finish",
                "BODY": "You are all set to go!"
            }
        },
        "TEAM_FORM": {
            "ERROR_MESSAGE": "Couldn't save the team details. Try again."
        },
        "AGENTS": {
            "AGENT": "Agent",
            "EMAIL": "Email",
            "BUTTON_TEXT": "Add agents",
            "ADD_AGENTS": "Adding Agents to your Team...",
            "SELECT": "select",
            "SELECT_ALL": "select all agents",
            "SELECTED_COUNT": "{selected} out of {total} agents selected."
        },
        "ADD": {
            "TITLE": "Add agents to team - {teamName}",
            "DESC": "Add Agents to your newly created team. This lets you collaborate as a team on conversations, get notified on new events in the same conversation.",
            "SELECT": "select",
            "SELECT_ALL": "select all agents",
            "SELECTED_COUNT": "{selected} out of {total} agents selected.",
            "BUTTON_TEXT": "Add agents",
            "AGENT_VALIDATION_ERROR": "Select at least one agent."
        },
        "FINISH": {
            "TITLE": "Your team is ready!",
            "MESSAGE": "You can now collaborate as a team on conversations. Happy supporting ",
            "BUTTON_TEXT": "Finish"
        },
        "DELETE": {
            "BUTTON_TEXT": "Delete",
            "API": {
                "SUCCESS_MESSAGE": "Team deleted successfully.",
                "ERROR_MESSAGE": "Couldn't delete the team. Try again."
            },
            "CONFIRM": {
                "TITLE": "Are you sure you want to delete the team?",
                "PLACE_HOLDER": "Please type {teamName} to confirm",
                "MESSAGE": "Deleting the team will remove the team assignment from the conversations assigned to this team.",
                "YES": "Delete ",
                "NO": "Cancel"
            }
        },
        "SETTINGS": "Settings",
        "FORM": {
            "UPDATE": "Update team",
            "CREATE": "Create team",
            "NAME": {
                "LABEL": "Team name",
                "PLACEHOLDER": "Example: Sales, Customer Support",
                "ERROR": "Team name is required and should be at least 2 characters long"
            },
            "DESCRIPTION": {
                "LABEL": "Team Description",
                "PLACEHOLDER": "Short description about this team."
            },
            "AUTO_ASSIGN": {
                "LABEL": "Allow auto assign for this team."
            },
            "SUBMIT_CREATE": "Create team"
        }
    },
    "THUMBNAIL": {
        "AUTHOR": {
            "NOT_AVAILABLE": "Author is not available"
        }
    },
    "TIME_AGO": {
        "SHORT": {
            "NOW": "now",
            "MINUTES": "{count}m",
            "HOURS": "{count}h",
            "DAYS": "{count}d",
            "WEEKS": "{count}w",
            "MONTHS": "{count}mo",
            "YEARS": "{count}y",
            "AGO": "{time} ago"
        }
    },
    "TIME_UNITS": {
        "days": "{1} :count day|[2,*] :count days",
        "hours": "{1} :count hour|[2,*] :count hours",
        "minutes": "{1} :count minute|[2,*] :count minutes",
        "seconds": "{0} :count seconds|{1} :count second|[2,*] :count seconds"
    },
    "TRANSLATE_MODAL": {
        "TITLE": "View translated content",
        "DESC": "You can view the translated content in each langauge.",
        "ORIGINAL_CONTENT": "Original Content",
        "TRANSLATED_CONTENT": "Translated Content",
        "NO_TRANSLATIONS_AVAILABLE": "No translations are available for this content"
    },
    "TYPING": {
        "ONE": "{user} is typing",
        "TWO": "{user} and {secondUser} are typing",
        "MULTIPLE": "{user} and {count} others are typing"
    },
    "VIDEO_EMBED": {
        "PLACEHOLDER": "Paste a video link",
        "HINT": "Works with YouTube, Vimeo, Loom, Wistia, Arcade, Bunny, CodePen, GuideJar and mp4 links",
        "ERROR": "That doesn't look like a supported video link",
        "ADD": "Embed",
        "CANCEL": "Cancel"
    },
    "WEBHOOKS_SETTINGS": {
        "HEADER": "Webhook Settings"
    },
    "WIDGET": {
        "COMPONENTS": {
            "FILE_BUBBLE": {
                "DOWNLOAD": "Download",
                "UPLOADING": "Uploading..."
            },
            "FORM_BUBBLE": {
                "SUBMIT": "Submit"
            },
            "MESSAGE_BUBBLE": {
                "RETRY": "Send message again",
                "ERROR_MESSAGE": "Couldn't send, try again"
            }
        },
        "THUMBNAIL": {
            "AUTHOR": {
                "NOT_AVAILABLE": "Not available"
            }
        },
        "TEAM_AVAILABILITY": {
            "ONLINE": "We are online",
            "OFFLINE": "We are away at the moment",
            "BACK_AS_SOON_AS_POSSIBLE": "We will be back as soon as possible"
        },
        "REPLY_TIME": {
            "IN_A_FEW_MINUTES": "Typically replies in a few minutes",
            "IN_A_FEW_HOURS": "Typically replies in a few hours",
            "IN_A_DAY": "Typically replies in a day",
            "BACK_IN_HOURS": "We will be back online in {n} hour | We will be back online in {n} hours",
            "BACK_IN_MINUTES": "We will be back online in {time} minutes",
            "BACK_AT_TIME": "We will be back online at {time}",
            "BACK_ON_DAY": "We will be back online on {day}",
            "BACK_TOMORROW": "We will be back online tomorrow",
            "BACK_IN_SOME_TIME": "We will be back online in some time"
        },
        "DAY_NAMES": {
            "SUNDAY": "Sunday",
            "MONDAY": "Monday",
            "TUESDAY": "Tuesday",
            "WEDNESDAY": "Wednesday",
            "THURSDAY": "Thursday",
            "FRIDAY": "Friday",
            "SATURDAY": "Saturday"
        },
        "START_CONVERSATION": "Start Conversation",
        "END_CONVERSATION": "End Conversation",
        "CONTINUE_CONVERSATION": "Continue conversation",
        "YOU": "You",
        "START_NEW_CONVERSATION": "Start a new conversation",
        "RESET_SESSION": {
            "BUTTON": "Start over as a new visitor",
            "CONFIRM_TITLE": "Start a new chat?",
            "CONFIRM_BODY": "The chat will start over as a new visitor. Earlier messages will no longer show in this browser.",
            "CONFIRM": "Start over",
            "CANCEL": "Cancel"
        },
        "VIEW_UNREAD_MESSAGES": "You have unread messages",
        "UNREAD_VIEW": {
            "VIEW_MESSAGES_BUTTON": "See new messages",
            "CLOSE_MESSAGES_BUTTON": "Close",
            "COMPANY_FROM": "from",
            "BOT": "Bot"
        },
        "BUBBLE": {
            "LABEL": "Chat with us"
        },
        "POWERED_BY": "Powered by {installationName}",
        "EMAIL_PLACEHOLDER": "Please enter your email",
        "EMAIL_SAVE_FAILED": "Your email was not saved. Please try again.",
        "CHAT_PLACEHOLDER": "Type a message…",
        "TODAY": "Today",
        "YESTERDAY": "Yesterday",
        "PRE_CHAT_FORM": {
            "FIELDS": {
                "FULL_NAME": {
                    "LABEL": "Full Name",
                    "PLACEHOLDER": "Please enter your full name",
                    "REQUIRED_ERROR": "Full Name is required"
                },
                "EMAIL_ADDRESS": {
                    "LABEL": "Email Address",
                    "PLACEHOLDER": "Please enter your email address",
                    "REQUIRED_ERROR": "Email Address is required",
                    "VALID_ERROR": "Please enter a valid email address"
                },
                "PHONE_NUMBER": {
                    "LABEL": "Phone Number",
                    "PLACEHOLDER": "Please enter your phone number",
                    "REQUIRED_ERROR": "Phone Number is required",
                    "DIAL_CODE_VALID_ERROR": "Please select a country code",
                    "VALID_ERROR": "Please enter a valid phone number",
                    "DROPDOWN_EMPTY": "No results found",
                    "DROPDOWN_SEARCH": "Search country"
                },
                "MESSAGE": {
                    "LABEL": "Message",
                    "PLACEHOLDER": "Please enter your message",
                    "ERROR": "Message too short"
                }
            },
            "CAMPAIGN_HEADER": "Please provide your name and email before starting the conversation",
            "IS_REQUIRED": "is required",
            "REQUIRED": "Required",
            "REGEX_ERROR": "Please provide a valid input"
        },
        "CHAT_FORM": {
            "INVALID": {
                "FIELD": "Invalid field"
            }
        },
        "EMOJI": {
            "PLACEHOLDER": "Search emojis",
            "NOT_FOUND": "No emoji match your search",
            "ARIA_LABEL": "Emoji picker"
        },
        "EMOJI_ICON_PICKER": {
            "SEARCH_EMOJI": "Search emoji…",
            "FREQUENTLY_USED": "Frequently used",
            "NO_EMOJI": "No emoji match your search"
        },
        "CSAT": {
            "TITLE": "Rate your conversation",
            "SUBMITTED_TITLE": "Thank you for submitting the rating",
            "PLACEHOLDER": "Tell us more..."
        },
        "EMAIL_CAPTURE": {
            "HINT": "We’ll email you when we reply, feel free to leave",
            "LABEL": "Email",
            "DONE": "We’ll reply to {email}"
        },
        "EMAIL_TRANSCRIPT": {
            "BUTTON_TEXT": "Request a conversation transcript",
            "SEND_EMAIL_SUCCESS": "The chat transcript was sent successfully",
            "SEND_EMAIL_ERROR": "There was an error, please try again"
        },
        "INTEGRATIONS": {
            "DYTE": {
                "CLICK_HERE_TO_JOIN": "Click here to join",
                "LEAVE_THE_ROOM": "Leave the call"
            }
        },
        "PORTAL": {
            "POPULAR_ARTICLES": "Popular Articles",
            "VIEW_ALL_ARTICLES": "View all articles",
            "IFRAME_LOAD_ERROR": "There was an error loading the article, please refresh the page and try again."
        },
        "ATTACHMENTS": {
            "image": {
                "CONTENT": "Picture message"
            },
            "audio": {
                "CONTENT": "Audio message"
            },
            "video": {
                "CONTENT": "Video message"
            },
            "file": {
                "CONTENT": "File Attachment"
            },
            "location": {
                "CONTENT": "Location"
            },
            "fallback": {
                "CONTENT": "has shared a url"
            }
        },
        "FOOTER_REPLY_TO": {
            "REPLY_TO": "Replying to:"
        },
        "MESSAGE_ACTIONS": {
            "REACT": "React",
            "REPLY": "Reply",
            "MORE": "More actions",
            "RECALL": "Unsend",
            "COPY": "Copy text"
        },
        "REACTIONS": {
            "COUNT": "{count} reacted {emoji}",
            "REMOVE": "Remove reaction {emoji}",
            "FAILED": "Could not add the reaction, please try again."
        },
        "RECALL": {
            "CONFIRM_TITLE": "Unsend this message?",
            "CONFIRM_BODY": "The message will be removed for both sides. You can only unsend within {minutes} minutes of sending.",
            "CANCEL": "Cancel",
            "CONFIRM": "Unsend",
            "BY_YOU": "You unsent a message",
            "BY_THEM": "This message was unsent",
            "EXPIRED": "The time limit for unsending has passed.",
            "FAILED": "Could not unsend the message. Please try again."
        },
        "REPLY": {
            "REPLYING_TO": "Replying to {name}",
            "YOU": "You",
            "CANCEL": "Cancel reply",
            "JUMP_TO_ORIGINAL": "View original message",
            "ORIGINAL_UNAVAILABLE": "Original message is no longer available"
        },
        "DELIVERY": {
            "SENT": "Sent",
            "DELIVERED": "Delivered",
            "SEEN": "Seen",
            "SENDING": "Sending…",
            "FAILED": "Not sent",
            "FAILED_TITLE": "Could not send the message"
        },
        "COMPOSER": {
            "ADD": "Add photo or file",
            "STICKER": "Stickers and emoji",
            "EMOJI": "Emoji",
            "CANCEL_UPLOAD": "Cancel upload",
            "CANCEL_SEND": "Cancel sending",
            "SEND": "Send",
            "CAPTION_PLACEHOLDER": "Add a caption…",
            "ATTACH_IMAGE": "Photos",
            "ATTACH_IMAGE_HINT": "You can pick more than one",
            "ATTACH_FILE": "Files",
            "ATTACH_FILE_HINT": "Up to {size} per file",
            "SELECTED_COUNT": "{count} photo selected | {count} photos selected",
            "REMOVE_ATTACHMENT": "Remove",
            "ADD_MORE": "Add more"
        },
        "STICKER_PANEL": {
            "TAB_STICKER": "Stickers",
            "TAB_EMOJI": "Emoji",
            "TAB_RECENT": "Recent",
            "RECENT_EMPTY": "Nothing here yet.",
            "STICKER_ALT": "Sticker",
            "SUGGESTIONS": "Suggested stickers",
            "DISMISS_SUGGESTIONS": "Hide suggested stickers"
        },
        "ATTACHMENT_STATE": {
            "UPLOADING": "Sending {count} photo… | Sending {count} photos…",
            "UPLOADING_FILE": "Sending file…",
            "UPLOADING_PROGRESS": "{size} · uploading {percent}%",
            "UPLOAD_FAILED_TITLE": "Could not send the photo",
            "UPLOAD_FAILED_FILE_TITLE": "Could not send the file",
            "UPLOAD_FAILED_SIZE": "File is over {size}",
            "UPLOAD_FAILED_NETWORK": "Connection is unstable, please try again.",
            "RETRY": "Try again",
            "PHOTO_COUNT": "{count} photo | {count} photos",
            "VIEW_ALL": "View all {count}"
        },
        "EMPTY_STATE": {
            "TITLE": "Hi there!",
            "BODY": "Send {name} a message about anything. You can attach photos, files or stickers.",
            "BODY_WITHOUT_STICKER": "Send {name} a message about anything. You can attach photos or files."
        },
        "HEADER": {
            "ONLINE": "Online",
            "AWAY": "Away",
            "CLOSE": "Close chat window",
            "BACK": "Back",
            "AGENT_ACTIVE": "Active now",
            "MORE": "More options",
            "POPOUT": "Open in a new window",
            "TRANSCRIPT": "Email me this chat",
            "NEW_CONVERSATION": "New conversation"
        },
        "OUT_OF_HOURS": {
            "TITLE": "We are outside support hours",
            "BODY": "Leave a message and we will reply when we open again.",
            "EMAIL_PLACEHOLDER": "Email to receive our reply",
            "CTA": "Leave a message",
            "EMAIL_TITLE": "Get our reply by email",
            "EMAIL_LABEL": "Your email",
            "HINT": "Or message us below, we will read it when we open.",
            "HOURS": "Our team is available from {from} to {to}.",
            "BODY_REOPEN": "Leave a message and we will reply when we open {reopen}.",
            "REOPEN": "We open again {reopen}.",
            "REOPEN_TODAY": "at {time}",
            "REOPEN_TOMORROW": "at {time} tomorrow",
            "REOPEN_ON_DAY": "at {time} on {day}",
            "REOPEN_TOMORROW_ALL_DAY": "tomorrow",
            "REOPEN_ON_DAY_ALL_DAY": "on {day}",
            "BANNER": "We are outside support hours and will reply when we open {reopen}.",
            "BANNER_FALLBACK": "We are outside support hours and will reply when we open again."
        },
        "CONVERSATION_END": {
            "TITLE": "This conversation has ended",
            "RATE_PROMPT": "How was the support you received?",
            "POOR": "Poor",
            "OKAY": "Okay",
            "GREAT": "Great",
            "FEEDBACK_PLACEHOLDER": "What could be better? (optional)",
            "SUBMIT": "Send rating",
            "SUBMIT_FAILED": "Your rating was not sent. Please try again.",
            "THANKS": "Thanks for your rating!",
            "SUPPORTED_MINUTES": "Helped you for {n} minute | Helped you for {n} minutes",
            "SUPPORTED_HOURS": "Helped you for {n} hour | Helped you for {n} hours",
            "SUPPORTED_DAYS": "Helped you for {n} day | Helped you for {n} days"
        },
        "LAUNCHER": {
            "OPEN": "Open chat",
            "CLOSE": "Minimize chat",
            "UNREAD": "{count} unread message | {count} unread messages",
            "OPEN_UNREAD": "Open chat, {count} unread message | Open chat, {count} unread messages"
        },
        "NEW_MESSAGES": "New messages",
        "TYPING_INDICATOR": {
            "LABEL": "Typing…"
        },
        "CARD": {
            "CTA_FALLBACK": "View details",
            "PREVIOUS": "Previous card",
            "NEXT": "Next card"
        },
        "TABS": {
            "LABEL": "Widget navigation",
            "HOME": "Home",
            "MESSAGES": "Messages",
            "HELP": "Help",
            "UPDATES": "Updates"
        },
        "NAV": {
            "BACK": "Back",
            "CLOSE": "Close",
            "EXPAND": "Expand",
            "COLLAPSE": "Collapse"
        },
        "HOME": {
            "GREETING_LINE": "Hi there,",
            "GREETING_DEFAULT": "how can {name} help?",
            "CONTINUE_WITH": "Continue with {name} · {time}",
            "CONTINUE": "Continue conversation · {time}",
            "SEND_NEW": "Send us a message",
            "START": "Start a conversation",
            "FIND_ANSWERS": "Find answers",
            "SEARCH_PLACEHOLDER": "Ask about returns, shipping…",
            "OTHER_CHANNELS": "Message us elsewhere",
            "REQUEST": "Submit a warranty or return request",
            "COMING_SOON": "Coming soon",
            "CHANNEL_HINT": {
                "ZALO": "Message {name} on Zalo",
                "MESSENGER": "{name} on Facebook",
                "TELEGRAM": "{name} on Telegram",
                "WHATSAPP": "{name} on WhatsApp",
                "INSTAGRAM": "{name} on Instagram",
                "TIKTOK": "{name} on TikTok",
                "HOTLINE": "Call us",
                "EMAIL": "Send an email",
                "CUSTOM": "Open link"
            },
            "CHANNEL_NAME": {
                "ZALO": "Zalo",
                "MESSENGER": "Messenger",
                "TELEGRAM": "Telegram",
                "WHATSAPP": "WhatsApp",
                "INSTAGRAM": "Instagram",
                "TIKTOK": "TikTok",
                "HOTLINE": "Call hotline",
                "EMAIL": "Email",
                "CUSTOM": "Link"
            }
        },
        "MESSAGE_LIST": {
            "TITLE": "Messages",
            "NEW": "Send us a message",
            "EMPTY_TITLE": "No messages yet",
            "EMPTY_BODY": "Your conversations with {name} will show up here.",
            "LOAD_FAILED": "Could not load conversations, please try again",
            "RETRY": "Try again",
            "LOAD_MORE": "Load more",
            "UNREAD": "{count} unread",
            "YOU": "You: {text}",
            "PICK": "Pick a conversation",
            "NEW_CONVERSATION": "New conversation"
        },
        "HELP": {
            "TITLE": "Help",
            "SEARCH": "Search for answers",
            "CLEAR": "Clear search",
            "POPULAR": "Frequently asked",
            "CATEGORIES": "Categories",
            "EMPTY_TITLE": "No articles yet",
            "EMPTY_BODY": "Message the shop and the team will get back to you.",
            "LOAD_FAILED": "Could not load articles, please try again",
            "RESULTS": "{count} articles",
            "NO_RESULTS": "No articles match “{query}”",
            "NOT_FOUND": "Didn’t find an answer?",
            "MESSAGE_TEAM": "Message the team",
            "UPDATED": "Updated {date}",
            "READ_TIME": "{n} min read",
            "STILL_NEED_HELP": "Still need help? Message the shop"
        },
        "UPDATES": {
            "TITLE": "Updates",
            "EMPTY_TITLE": "No news yet",
            "EMPTY_BODY": "Promotions, new arrivals and announcements from {name} will show up here.",
            "LOAD_FAILED": "Could not load updates, please try again",
            "ASK": "Ask the shop about this",
            "TAG": {
                "PROMO": "Promotion",
                "NEW": "New arrival",
                "NOTICE": "Announcement"
            }
        },
        "REQUEST": {
            "TITLE": "Send a request",
            "NOTICE_TITLE": "Coming soon",
            "NOTICE_BODY": "Meanwhile, message the shop directly and the team will handle it as a request.",
            "WARRANTY": "Warranty claim",
            "WARRANTY_HINT": "Photos of the issue, order number",
            "RETURN": "Return or exchange",
            "RETURN_HINT": "Order number and reason",
            "INVOICE": "VAT invoice",
            "INVOICE_HINT": "Company name, tax code",
            "MESSAGE_SHOP": "Message the shop"
        },
        "TIME": {
            "NOW": "just now",
            "MINUTES": "{n}m",
            "HOURS": "{n}h",
            "YESTERDAY": "Yesterday"
        }
    },
    "WIDGET_BUILDER": {
        "COMING_SOON": "Coming soon",
        "HEADER": {
            "BREADCRUMB_ARIA_LABEL": "Breadcrumb",
            "BREADCRUMB_SETTINGS": "Settings",
            "BREADCRUMB_INBOXES": "Inboxes",
            "TITLE": "Widget chat",
            "SAVE_SUCCESS": "Widget settings saved.",
            "SAVE_ERROR": "Could not save the widget settings, please try again."
        },
        "NAV": {
            "ARIA_LABEL": "Widget settings sections",
            "APPEARANCE": "Appearance",
            "HOME": "Home",
            "CHANNELS": "Other channels & links",
            "CAPTURE": "Collect customer info",
            "INVITE": "Proactive invites",
            "AI": "AI assistant",
            "EMBED": "Embed code"
        },
        "PREVIEW": {
            "TITLE": "Preview",
            "DEVICE_LABEL": "Preview on",
            "DEVICE_DESKTOP": "Desktop",
            "DEVICE_MOBILE": "Mobile",
            "IFRAME_TITLE": "Widget preview"
        },
        "APPEARANCE": {
            "TITLE": "Appearance",
            "DESCRIPTION": "Color, launcher and position on your website.",
            "ACCENT_COLOR_LABEL": "Accent color",
            "ACCENT_COLOR_HEX_LABEL": "Hex code",
            "ACCENT_COLOR_CONTRAST_GOOD": "White text reads well on this color ({ratio}:1)",
            "ACCENT_COLOR_CONTRAST_BAD": "White text is hard to read on this color ({ratio}:1) — the widget will switch to dark text",
            "ACCENT_COLOR_INVALID": "Invalid color code — use #RRGGBB",
            "LAUNCHER_LABEL": "Launcher style",
            "LAUNCHER_ROUND": "Round",
            "LAUNCHER_PILL": "With label",
            "LAUNCHER_LABEL_PLACEHOLDER": "Chat with us",
            "POSITION_LABEL": "Position",
            "POSITION_LEFT": "Left",
            "POSITION_RIGHT": "Right",
            "GREETING_LABEL": "Home greeting",
            "GREETING_HINT": "Shown right under the shop name on the widget home screen.",
            "GREETING_PLACEHOLDER": "How can we help?",
            "ACCOUNT_LANGUAGE_LABEL": "Language",
            "ACCOUNT_LANGUAGE_HINT": "Applies to the whole account: every website chat widget and the dashboard of teammates who have not picked their own language. The embedding page can still pick another language with the locale option of the embed code.",
            "SOUND_LABEL": "New message sound",
            "SOUND_HINT": "Plays on your website when the shop replies while the visitor has the page open."
        },
        "HOME": {
            "TITLE": "Home",
            "DESCRIPTION": "Toggle each block on or off. Turn all of them off and the widget opens straight into chat.",
            "ALWAYS_ON": "Always on",
            "BLOCK_MESSAGE_SHOP": "Message the shop",
            "BLOCK_MESSAGE_SHOP_DESCRIPTION": "Always shown, with online status and reply time.",
            "BLOCK_RECENT_CONVERSATION": "Recent conversation",
            "BLOCK_HELP": "Search help & top articles",
            "HELP_BLOCK_CONNECTED": "Pulled from the \"{portal}\" help center, {count} articles",
            "HELP_BLOCK_NOT_CONNECTED": "No help center connected — connect one",
            "BLOCK_OTHER_CHANNELS": "Other channels (Zalo, Messenger, hotline)",
            "BLOCK_CUSTOM_LINKS": "Custom links",
            "BLOCK_REQUEST": "Submit a request by type",
            "BLOCK_REQUEST_DESCRIPTION": "Customers pick the exact request type (return, warranty…) before messaging."
        },
        "CHANNELS": {
            "TITLE": "Other channels",
            "DESCRIPTION": "Tapping one opens that channel directly. Only enabled channels show on the widget home screen.",
            "KIND_HOTLINE": "Hotline",
            "KIND_EMAIL": "Email",
            "KIND_CUSTOM": "Other",
            "VALUE_LABEL": "Address or number",
            "ENABLED_LABEL": "Enable this channel",
            "MOVE_UP": "Move up",
            "MOVE_DOWN": "Move down",
            "REMOVE": "Remove",
            "ADD": "Add channel",
            "LINKS_TITLE": "Custom links",
            "LINKS_DESCRIPTION": "Up to {max} links. Opens in a new tab.",
            "LINK_LABEL_LABEL": "Display name",
            "LINK_URL_LABEL": "Address",
            "ADD_LINK": "Add link"
        },
        "CAPTURE": {
            "TITLE": "Collect customer info",
            "DESCRIPTION": "Asked mid-conversation after the first message — never blocks the customer from messaging.",
            "PHONE_LABEL": "Ask for phone number",
            "EMAIL_LABEL": "Ask for email"
        },
        "INVITE": {
            "TITLE": "Proactive invites",
            "DESCRIPTION": "Reuses the live chat campaign module — add or edit invites on the Campaigns page.",
            "ADD": "Add invite",
            "EMPTY": "This inbox has no proactive invites yet.",
            "QUICK_REPLIES_COUNT": "{count} quick reply buttons",
            "STATUS_ON": "On",
            "STATUS_OFF": "Off",
            "AUDIENCE_ALL": "All customers",
            "AUDIENCE_NEW": "New customers",
            "AUDIENCE_RETURNING": "Returning customers",
            "MANAGE_LINK": "Manage proactive invites"
        },
        "AI": {
            "TITLE": "AI assistant",
            "DESCRIPTION": "The AI brain does not exist in Yona yet — here is a preview of what it will do.",
            "FEATURE_KNOWLEDGE": "Answers from the shop's documents and saved replies.",
            "FEATURE_AUTO_REPLY": "Replies to customers automatically, with agents able to step in anytime.",
            "FEATURE_HANDOFF": "Hands off to an agent when the customer asks for one, or the AI is unsure.",
            "MOCK_CUSTOMER_MESSAGE": "I bought this but it doesn't fit — how do I exchange it?",
            "MOCK_AI_REPLY": "You can exchange it within 7 days of delivery, as long as the tag is still on.",
            "MOCK_SOURCE": "Source: 7-day exchange policy"
        },
        "EMBED": {
            "TITLE": "Embed code",
            "DESCRIPTION": "Paste this snippet right before </body>. Paste it once and the widget shows on every page.",
            "NO_LOADED_EVENT_YET": "Yona doesn't record when customers last opened the widget yet, so there's no \"running on…\" banner here.",
            "DOMAINS_LABEL": "Only show on these domains",
            "DOMAINS_HINT": "Stops others from copying your snippet onto their own site. Leave empty to allow any domain.",
            "DOMAINS_PLACEHOLDER": "Enter a domain, press Enter to add"
        }
    },
    "WIDGET_UPDATES_MGMT": {
        "HEADER": "Widget updates",
        "HEADER_BTN_TXT": "Add update",
        "DESCRIPTION": "Post promos, new products or announcements to the Updates tab of the website chat widget.",
        "LOADING": "Loading updates",
        "SEARCH_PLACEHOLDER": "Search updates...",
        "NO_RESULTS": "No matching updates found",
        "LIST": {
            "404": "No updates yet. Add the first one so customers see it in the Updates tab.",
            "TABLE_HEADER": {
                "COVER": "Cover",
                "TITLE": "Title",
                "TAG": "Tag",
                "INBOX": "Inbox",
                "STATUS": "Status",
                "ACTION": "Action"
            },
            "ALL_INBOXES": "All websites",
            "STATUS_DRAFT": "Draft",
            "STATUS_PUBLISHED": "Published"
        },
        "FORM": {
            "TITLE": {
                "LABEL": "Title",
                "PLACEHOLDER": "15% off the blue-glaze collection until 09/30",
                "REQUIRED_ERROR": "Title is required",
                "MAX_ERROR": "Title is at most 120 characters"
            },
            "BODY": {
                "LABEL": "Content",
                "PLACEHOLDER": "Describe the update. Line breaks are kept as-is on the widget.",
                "MAX_ERROR": "Content is at most 5000 characters"
            },
            "TAG": {
                "LABEL": "Tag"
            },
            "COVER": {
                "LABEL": "Cover image",
                "UPLOAD_BTN": "Upload image",
                "REPLACE_BTN": "Replace image",
                "REMOVE_BTN": "Remove image",
                "UPLOAD_ERROR": "Upload failed, please try again"
            },
            "CTA_LABEL": {
                "LABEL": "Button text",
                "PLACEHOLDER": "View collection",
                "REQUIRED_ERROR": "Button text is required when a link is set",
                "MAX_ERROR": "At most 40 characters"
            },
            "CTA_URL": {
                "LABEL": "Button link",
                "PLACEHOLDER": "https://...",
                "INVALID_ERROR": "Link must start with http:// or https://"
            },
            "INBOX": {
                "LABEL": "Show in inbox",
                "PLACEHOLDER": "All websites"
            },
            "PREVIEW_TITLE": "Preview on the widget",
            "SAVE_DRAFT": "Save draft",
            "PUBLISH": "Publish",
            "UNPUBLISH": "Unpublish",
            "CANCEL": "Cancel",
            "EDIT": "Edit",
            "DELETE": "Delete"
        },
        "ADD": {
            "TITLE": "Add update",
            "DESC": "New posts are saved as a draft until you press Publish.",
            "API": {
                "SUCCESS_MESSAGE": "Update saved",
                "ERROR_MESSAGE": "Something went wrong, please try again"
            }
        },
        "EDIT": {
            "TITLE": "Edit update",
            "API": {
                "SUCCESS_MESSAGE": "Changes saved",
                "ERROR_MESSAGE": "Something went wrong, please try again"
            }
        },
        "PUBLISH": {
            "API": {
                "SUCCESS_MESSAGE": "Published to the widget",
                "ERROR_MESSAGE": "Publishing failed, please try again"
            }
        },
        "UNPUBLISH": {
            "API": {
                "SUCCESS_MESSAGE": "Removed from the widget",
                "ERROR_MESSAGE": "Unpublishing failed, please try again"
            }
        },
        "DELETE": {
            "CONFIRM": {
                "TITLE": "Confirm deletion",
                "MESSAGE": "Are you sure you want to delete",
                "YES": "Yes, delete",
                "NO": "No, keep it"
            },
            "API": {
                "SUCCESS_MESSAGE": "Update deleted",
                "ERROR_MESSAGE": "Something went wrong, please try again"
            }
        }
    }
};

export default messages;
