// Sinh bởi `php artisan i18n:generate` từ lang/{locale}/*.php — KHÔNG SỬA TAY.
const messages: Record<string, unknown> = {
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
                "ERROR_MESSAGE": "Could not connect to Woot Server, Please try again later"
            }
        },
        "DELETE": {
            "BUTTON_TEXT": "Delete",
            "API": {
                "SUCCESS_MESSAGE": "Agent deleted successfully",
                "ERROR_MESSAGE": "Could not connect to Woot Server, Please try again later"
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
                "ERROR_MESSAGE": "Could not connect to Woot Server, Please try again later"
            },
            "PASSWORD_RESET": {
                "ADMIN_RESET_BUTTON": "Reset Password",
                "ADMIN_SUCCESS_MESSAGE": "An email with reset password instructions has been sent to the agent",
                "SUCCESS_MESSAGE": "Agent password reset successfully",
                "ERROR_MESSAGE": "Could not connect to Woot Server, Please try again later"
            }
        },
        "SEARCH_PLACEHOLDER": "Search agents...",
        "NO_RESULTS": "No agents found matching your search",
        "SEARCH": {
            "NO_RESULTS": "No results found."
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
    "AUTH": {
        "failed": "Invalid login credentials. Please try again.",
        "unconfirmed": "You have to confirm your email address before continuing. Please confirm your email :email.",
        "throttle": "Too many login attempts. Please try again in :seconds seconds.",
        "signup": {
            "invalid_email": "Please enter a valid email address.",
            "user_exists": "A user with this email address already exists.",
            "failed": "Could not create the account. Please try again."
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
    "BREADCRUMB": {
        "ARIA_LABEL": "Breadcrumb"
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
        "COMING_SOON": "Coming Soon!"
    },
    "CHAT_LIST": {
        "LOADING": "Fetching conversations",
        "LOAD_MORE_CONVERSATIONS": "Load more conversations",
        "EOF": "All conversations loaded 🎉",
        "LIST": {
            "404": "There are no active conversations in this group."
        },
        "FAILED_TO_SEND": "Failed to send",
        "FETCH_ERROR": "Couldn't load conversations. Please try again.",
        "TAB_HEADING": "Conversations",
        "MENTION_HEADING": "Mentions",
        "UNATTENDED_HEADING": "Unattended",
        "SEARCH": {
            "INPUT": "Search for People, Chats, Saved Replies .."
        },
        "FILTER_ALL": "All",
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
        "SORT_TOOLTIP_LABEL": "Sort conversations",
        "CHAT_SORT": {
            "STATUS": "Status",
            "ORDER_BY": "Order by"
        },
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
                "CONTENT": "Shared contact"
            },
            "embed": {
                "CONTENT": "Embedded content"
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
        "NO_CONTENT": "No content available",
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
    "COMMON": {
        "OR": "Or",
        "CLICK_HERE": "click here"
    },
    "COMPONENTS": {
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
            "LOADING_FAILED": "Loading failed"
        }
    },
    "COMPOSE_NEW_CONVERSATION": {
        "CONTACT_SEARCH": {
            "ERROR_MESSAGE": "We couldn’t complete the search. Please try again."
        },
        "CONTACT_CREATE": {
            "ERROR_MESSAGE": "We couldn’t create the contact. Please try again."
        },
        "FORM": {
            "GO_TO_CONVERSATION": "View",
            "SUCCESS_MESSAGE": "The message was sent successfully!",
            "ERROR_MESSAGE": "An error occurred while creating the conversation. Please try again later.",
            "NO_INBOX_ALERT": "There are no available inboxes to start a conversation with this contact.",
            "CONTACT_SELECTOR": {
                "LABEL": "To:",
                "TAG_INPUT_PLACEHOLDER": "Enter at least 2 characters to search by name, email, or phone number",
                "CONTACT_CREATING": "Creating contact..."
            },
            "INBOX_SELECTOR": {
                "LABEL": "Via:",
                "BUTTON": "Show inboxes"
            },
            "EMAIL_OPTIONS": {
                "SUBJECT_LABEL": "Subject :",
                "SUBJECT_PLACEHOLDER": "Enter your email subject here",
                "CC_LABEL": "Cc:",
                "CC_PLACEHOLDER": "Enter at least 2 characters to search by email",
                "BCC_LABEL": "Bcc:",
                "BCC_PLACEHOLDER": "Enter at least 2 characters to search by email",
                "BCC_BUTTON": "Bcc"
            },
            "MESSAGE_EDITOR": {
                "PLACEHOLDER": "Write your message here..."
            },
            "WHATSAPP_OPTIONS": {
                "LABEL": "Select template",
                "SEARCH_PLACEHOLDER": "Search templates",
                "EMPTY_STATE": "No templates found",
                "TEMPLATE_PARSER": {
                    "TEMPLATE_NAME": "WhatsApp template: {templateName}",
                    "VARIABLES": "Variables",
                    "BACK": "Go back",
                    "SEND_MESSAGE": "Send message"
                }
            },
            "TWILIO_OPTIONS": {
                "LABEL": "Select template",
                "SEARCH_PLACEHOLDER": "Search templates",
                "EMPTY_STATE": "No templates found",
                "TEMPLATE_PARSER": {
                    "BACK": "Go back",
                    "SEND_MESSAGE": "Send message"
                }
            },
            "ACTION_BUTTONS": {
                "DISCARD": "Discard",
                "SEND": "Send ({keyCode})"
            }
        }
    },
    "CONTACT_FORM": {
        "FORM": {
            "SUBMIT": "Submit",
            "CANCEL": "Cancel",
            "AVATAR": {
                "LABEL": "Contact Avatar"
            },
            "NAME": {
                "PLACEHOLDER": "Enter the full name of the contact",
                "LABEL": "Full Name"
            },
            "BIO": {
                "PLACEHOLDER": "Enter the bio of the contact",
                "LABEL": "Bio"
            },
            "EMAIL_ADDRESS": {
                "PLACEHOLDER": "Enter the email address of the contact",
                "LABEL": "Email Address",
                "DUPLICATE": "This email address is in use for another contact.",
                "ERROR": "Please enter a valid email address."
            },
            "PHONE_NUMBER": {
                "PLACEHOLDER": "Enter the phone number of the contact",
                "LABEL": "Phone Number",
                "HELP": "Phone number should be of E.164 format eg: +1415555555 [+][country code][area code][local phone number]. You can select the dial code from the dropdown.",
                "ERROR": "Phone number should be either empty or of E.164 format",
                "DIAL_CODE_ERROR": "Please select a dial code from the list",
                "DUPLICATE": "This phone number is in use for another contact."
            },
            "LOCATION": {
                "PLACEHOLDER": "Enter the location of the contact",
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
                "SUCCESS_MESSAGE": "Contact avatar deleted successfully",
                "ERROR_MESSAGE": "Could not delete the contact avatar. Please try again later."
            }
        },
        "SUCCESS_MESSAGE": "Contact saved successfully",
        "ERROR_MESSAGE": "There was an error, please try again"
    },
    "CONTACT_PANEL": {
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
        "CALL": "Call",
        "CALL_INITIATED": "Calling the contact…",
        "CALL_FAILED": "Unable to start the call. Please try again.",
        "WHATSAPP_CALL_PERMISSION_REQUESTED": "Sent a call permission request to the contact. Try again once they accept.",
        "WHATSAPP_CALL_PERMISSION_PENDING": "Call permission request already sent recently. Try again once the contact accepts.",
        "CLICK_TO_EDIT": "Click to edit",
        "VOICE_INBOX_PICKER": {
            "TITLE": "Choose a voice inbox"
        },
        "CONVERSATIONS": {
            "NO_RECORDS_FOUND": "There are no previous conversations associated to this contact.",
            "TITLE": "Previous Conversations"
        },
        "LABELS": {
            "CONTACT": {
                "TITLE": "Contact Labels",
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
                "CREATE_LABEL": "Create new label"
            }
        },
        "MERGE_CONTACT": "Merge contact",
        "CONTACT_ACTIONS": "Contact actions",
        "MUTE_CONTACT": "Block Contact",
        "UNMUTE_CONTACT": "Unblock Contact",
        "MUTED_SUCCESS": "This contact is blocked successfully. You will not be notified of any future conversations.",
        "UNMUTED_SUCCESS": "This contact is unblocked successfully.",
        "SEND_TRANSCRIPT": "Send Transcript",
        "EDIT_LABEL": "Edit",
        "SIDEBAR_SECTIONS": {
            "CUSTOM_ATTRIBUTES": "Custom Attributes",
            "CONTACT_LABELS": "Contact Labels",
            "PREVIOUS_CONVERSATIONS": "Previous Conversations",
            "NO_RECORDS_FOUND": "No attributes found"
        }
    },
    "CONTACTS": {
        "online": {
            "delete": "{contact_name} is Online, please try again later"
        }
    },
    "CONTACTS_BULK_ACTIONS": {
        "ASSIGN_LABELS": "Assign Labels",
        "REMOVE_LABELS": "Remove Labels",
        "ASSIGN_LABELS_SUCCESS": "Labels assigned successfully.",
        "ASSIGN_LABELS_FAILED": "Failed to assign labels",
        "REMOVE_LABELS_SUCCESS": "Labels removed successfully.",
        "REMOVE_LABELS_FAILED": "Failed to remove labels",
        "DESCRIPTION": "Select the labels you want to add to the selected contacts.",
        "NO_LABELS_FOUND": "No labels available yet.",
        "SELECTED_COUNT": "{count} selected",
        "CLEAR_SELECTION": "Clear selection",
        "SELECT_ALL": "Select all ({count})",
        "DELETE_CONTACTS": "Delete",
        "DELETE_SUCCESS": "Contacts deleted successfully.",
        "DELETE_FAILED": "Failed to delete contacts.",
        "DELETE_DIALOG": {
            "TITLE": "Delete selected contacts",
            "SINGULAR_TITLE": "Delete selected contact",
            "DESCRIPTION": "This will permanently delete {count} selected contacts. This action cannot be undone.",
            "SINGULAR_DESCRIPTION": "This will permanently delete the selected contact. This action cannot be undone.",
            "CONFIRM_MULTIPLE": "Delete contacts",
            "CONFIRM_SINGLE": "Delete contact"
        }
    },
    "CONTACTS_LAYOUT": {
        "HEADER": {
            "TITLE": "Contacts",
            "SEARCH_TITLE": "Search contacts",
            "ACTIVE_TITLE": "Active contacts",
            "SEARCH_PLACEHOLDER": "Search...",
            "MESSAGE_BUTTON": "Message",
            "SEND_MESSAGE": "Send message",
            "BLOCK_CONTACT": "Block contact",
            "UNBLOCK_CONTACT": "Unblock contact",
            "BREADCRUMB": {
                "CONTACTS": "Contacts"
            },
            "ACTIONS": {
                "CONTACT_CREATION": {
                    "ADD_CONTACT": "Add contact",
                    "EXPORT_CONTACT": "Export contacts",
                    "IMPORT_CONTACT": "Import contacts",
                    "SAVE_CONTACT": "Save contact",
                    "EMAIL_ADDRESS_DUPLICATE": "This email address is in use for another contact.",
                    "PHONE_NUMBER_DUPLICATE": "This phone number is in use for another contact.",
                    "SUCCESS_MESSAGE": "Contact saved successfully",
                    "ERROR_MESSAGE": "Unable to save contact. Please try again later."
                },
                "BLOCK_SUCCESS_MESSAGE": "This contact is blocked successfully",
                "BLOCK_ERROR_MESSAGE": "Unable to block contact. Please try again later.",
                "UNBLOCK_SUCCESS_MESSAGE": "This contact is unblocked successfully",
                "UNBLOCK_ERROR_MESSAGE": "Unable to unblock contact. Please try again later.",
                "IMPORT_CONTACT": {
                    "TITLE": "Import contacts",
                    "DESCRIPTION": "Import contacts through a CSV file.",
                    "DOWNLOAD_LABEL": "Download a sample csv.",
                    "LABEL": "CSV File:",
                    "CHOOSE_FILE": "Choose file",
                    "CHANGE": "Change",
                    "CANCEL": "Cancel",
                    "IMPORT": "Import",
                    "SUCCESS_MESSAGE": "You will be notified via email when the import is complete.",
                    "ERROR_MESSAGE": "There was an error, please try again"
                },
                "EXPORT_CONTACT": {
                    "TITLE": "Export contacts",
                    "DESCRIPTION": "Quickly export a csv file with comprehensive details of your contacts",
                    "CONFIRM": "Export",
                    "SUCCESS_MESSAGE": "Export is in progress. You will be notified on email when the export file is ready to download.",
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
            "SHOWING": "Showing {startItem} - {endItem} of {totalItems} contact | Showing {startItem} - {endItem} of {totalItems} contacts"
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
            "TITLE": "Filter contacts",
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
        "CARD": {
            "OF": "of",
            "VIEW_DETAILS": "View details",
            "EDIT_DETAILS_FORM": {
                "TITLE": "Edit contact details",
                "FORM": {
                    "FIRST_NAME": {
                        "PLACEHOLDER": "Enter the first name"
                    },
                    "LAST_NAME": {
                        "PLACEHOLDER": "Enter the last name"
                    },
                    "EMAIL_ADDRESS": {
                        "PLACEHOLDER": "Enter the email address",
                        "DUPLICATE": "This email address is in use for another contact."
                    },
                    "PHONE_NUMBER": {
                        "PLACEHOLDER": "Enter the phone number",
                        "DUPLICATE": "This phone number is in use for another contact."
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
                "UPDATE_BUTTON": "Update contact",
                "SUCCESS_MESSAGE": "Contact updated successfully",
                "ERROR_MESSAGE": "Unable to update contact. Please try again later."
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
            "DELETE_CONTACT_DESCRIPTION": "Permanently delete this contact. This action is irreversible",
            "DELETE_CONTACT": "Delete contact",
            "DELETE_DIALOG": {
                "TITLE": "Confirm Deletion",
                "DESCRIPTION": "Are you sure you want to delete this contact?",
                "CONFIRM": "Yes, Delete",
                "API": {
                    "SUCCESS_MESSAGE": "Contact deleted successfully",
                    "ERROR_MESSAGE": "Could not delete contact. Please try again later."
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
                "MERGE": "Merge"
            },
            "HISTORY": {
                "EMPTY_STATE": "There are no previous conversations associated to this contact"
            },
            "ATTRIBUTES": {
                "SEARCH_PLACEHOLDER": "Search for attributes",
                "UNUSED_ATTRIBUTES": "{count} Used attribute | {count} Unused attributes",
                "EMPTY_STATE": "There are no contact custom attributes available in this account. You can create a custom attribute in settings.",
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
                "TITLE": "Merge contact",
                "DESCRIPTION": "Combine two profiles into one, including all attributes and conversations. In case of conflict, the primary contact’s attributes will take precedence.",
                "PRIMARY": "Primary contact",
                "PRIMARY_HELP_LABEL": "To be saved",
                "PRIMARY_REQUIRED_ERROR": "Please select a contact to merge with before proceeding",
                "PARENT": "To be merged",
                "PARENT_HELP_LABEL": "To be deleted",
                "EMPTY_STATE": "No contacts found",
                "PLACEHOLDER": "Search for primary contact",
                "SEARCH_PLACEHOLDER": "Search for a contact",
                "SEARCH_ERROR_MESSAGE": "Could not search for contacts. Please try again later.",
                "SUCCESS_MESSAGE": "Contact merged successfully",
                "ERROR_MESSAGE": "Could not merge contacts, try again!",
                "IS_SEARCHING": "Searching...",
                "BUTTONS": {
                    "CANCEL": "Cancel",
                    "CONFIRM": "Merge contact"
                }
            },
            "NOTES": {
                "PLACEHOLDER": "Add a note",
                "WROTE": "wrote",
                "YOU": "You",
                "SAVE": "Save note",
                "ADD_NOTE": "Add contact note",
                "EXPAND": "Expand",
                "COLLAPSE": "Collapse",
                "NO_NOTES": "No notes, you can add notes from the contact details page.",
                "EMPTY_STATE": "There are no notes associated to this contact. You can add a note by typing in the box above.",
                "CONVERSATION_EMPTY_STATE": "There are no notes yet. Use the Add note button to create one."
            }
        },
        "EMPTY_STATE": {
            "TITLE": "No contacts found in this account",
            "SUBTITLE": "Start adding new contacts by clicking on the button below",
            "BUTTON_LABEL": "Add contact",
            "SEARCH_EMPTY_STATE_TITLE": "No contacts matches your search 🔍",
            "LIST_EMPTY_STATE_TITLE": "No contacts available in this view 📋",
            "ACTIVE_EMPTY_STATE_TITLE": "No contacts are active at the moment 🌙"
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
        "INSTAGRAM_RESTRICTION_BANNER": "Instagram messaging is currently affected by an API-level issue on Meta’s side, not a problem with Chatwoot. Some messages or actions may be delayed or unavailable. We’re working closely with Meta to resolve it as quickly as possible.",
        "INSTAGRAM_RESTRICTION_STATUS_LINK": "View status updates",
        "REPLYING_TO": "You are replying to:",
        "REMOVE_SELECTION": "Remove Selection",
        "DOWNLOAD": "Download",
        "UNKNOWN_FILE_TYPE": "Unknown File",
        "SAVE_CONTACT": "Save Contact",
        "NO_CONTENT": "No content to display",
        "SHARED_ATTACHMENT": {
            "CONTACT": "{sender} has shared a contact",
            "LOCATION": "{sender} has shared a location",
            "FILE": "{sender} has shared a file",
            "MEETING": "{sender} has started a meeting"
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
        "RESOLVE_DROPDOWN": {
            "MARK_PENDING": "Mark as pending",
            "SNOOZE_UNTIL": "Snooze",
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
            "PRIVATE_MSG_INPUT": "Shift + enter for new line. This will be visible only to Agents",
            "MESSAGING_RESTRICTED": "You cannot reply to this conversation",
            "MESSAGING_RESTRICTED_WHATSAPP": "You can only reply using a template message due to 24-hour message window restriction",
            "MESSAGING_RESTRICTED_API": "You can only reply using a template message due to message window restriction",
            "MESSAGE_SIGNATURE_NOT_CONFIGURED": "Message signature is not configured, please configure it in profile settings.",
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
            "TIP_ATTACH_ICON": "Attach files",
            "TIP_AUDIORECORDER_ICON": "Record audio",
            "TIP_AUDIORECORDER_PERMISSION": "Allow access to audio",
            "TIP_AUDIORECORDER_ERROR": "Could not open the audio",
            "AUDIO_CONVERSION_FAILED": "Audio conversion failed. Please try again.",
            "DRAG_DROP": "Drag and drop here to attach",
            "IMAGE_UPLOAD_SUCCESS": "Image uploaded successfully",
            "START_AUDIO_RECORDING": "Start audio recording",
            "STOP_AUDIO_RECORDING": "Stop audio recording",
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
        "BOT": "Bot",
        "NATIVE_APP": "Native app",
        "NATIVE_APP_ADVISORY": "This message was sent from the native app. Reply from Chatwoot to maintain the message window.",
        "SEND_FAILED": "Couldn't send message! Try again",
        "TRY_AGAIN": "retry",
        "ASSIGNMENT": {
            "SELECT_AGENT": "Select Agent",
            "REMOVE": "Remove",
            "ASSIGN": "Assign"
        },
        "CONTEXT_MENU": {
            "COPY": "Copy",
            "REPLY_TO": "Reply to this message",
            "DELETE": "Delete",
            "CREATE_A_CANNED_RESPONSE": "Add to canned responses",
            "TRANSLATE": "Translate",
            "COPY_PERMALINK": "Copy link to the message",
            "LINK_COPIED": "Message URL copied to the clipboard",
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
            "CONTACT": "Contact",
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
            "CONTACT_DETAILS": "Contact Details",
            "CONVERSATION_ACTIONS": "Conversation Actions",
            "CONVERSATION_LABELS": "Conversation Labels",
            "CONVERSATION_INFO": "Conversation Information",
            "CONTACT_NOTES": "Contact Notes",
            "CONTACT_ATTRIBUTES": "Contact Attributes",
            "PREVIOUS_CONVERSATION": "Previous Conversations",
            "MACROS": "Macros",
            "LINEAR_ISSUES": "Linked Linear Issues",
            "SHOPIFY_ORDERS": "Shopify Orders",
            "SHARED_FILES": "Attachments"
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
            "JUMP_TO_MESSAGE": "Jump to message"
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
    "COPILOT": {
        "TRY_THESE_PROMPTS": "Try these prompts"
    },
    "CREATE_ACCOUNT": {
        "NO_ACCOUNT_WARNING": "Uh oh! We could not find any Chatwoot accounts. Please create a new account to continue.",
        "NEW_ACCOUNT": "New Account",
        "SELECTOR_SUBTITLE": "Create a new account",
        "API": {
            "SUCCESS_MESSAGE": "Account created successfully",
            "EXIST_MESSAGE": "Account already exists",
            "ERROR_MESSAGE": "Could not connect to Woot Server, Please try again later"
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
    "DELETE_CONTACT": {
        "BUTTON_LABEL": "Delete Contact",
        "TITLE": "Delete contact",
        "DESC": "Delete contact details",
        "CONFIRM": {
            "TITLE": "Confirm Deletion",
            "MESSAGE": "Are you sure to delete ",
            "YES": "Yes, Delete",
            "NO": "No, Keep"
        },
        "API": {
            "SUCCESS_MESSAGE": "Contact deleted successfully",
            "ERROR_MESSAGE": "Could not delete contact. Please try again later."
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
        "BUTTON_LABEL": "Edit Contact",
        "TITLE": "Edit contact",
        "DESC": "Edit contact details"
    },
    "EMAIL_HEADER": {
        "FROM": "From",
        "TO": "To",
        "BCC": "Bcc",
        "CC": "Cc",
        "SUBJECT": "Subject",
        "EXPAND": "Expand email"
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
    "GALLERY_VIEW": {
        "ERROR_DOWNLOADING": "Unable to download attachment. Please try again"
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
        "BACK": "Back"
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
                "BODY": "Choose the provider you want to integrate with Chatwoot."
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
                "HELP": "PS: By signing in, we only get access to your Page's messages. Your private messages can never be accessed by Chatwoot.",
                "CHOOSE_PAGE": "Choose Page",
                "CHOOSE_PLACEHOLDER": "Select a page from the list",
                "INBOX_NAME": "Inbox Name",
                "ADD_NAME": "Add a name for your inbox",
                "PICK_NAME": "Pick a Name for your Inbox",
                "PICK_A_VALUE": "Pick a value",
                "CREATE_INBOX": "Create Inbox",
                "RESTRICTED_WARNING": "Facebook inbox creation is temporarily unavailable due to an API-level issue on Meta’s side, not a problem with Chatwoot. We’re working closely with Meta to resolve it as quickly as possible.",
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
                "RESTRICTED_WARNING": "Instagram inbox creation is temporarily unavailable due to an API-level issue on Meta’s side, not a problem with Chatwoot. We’re working closely with Meta to resolve it as quickly as possible.",
                "SETTINGS_RESTRICTED_WARNING": "Instagram messaging is currently affected by an API-level issue on Meta’s side, not a problem with Chatwoot. Some messages or actions may be delayed or unavailable. We’re working closely with Meta to resolve it as quickly as possible.",
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
                    "PLACEHOLDER": "Hi there !"
                },
                "CHANNEL_WELCOME_TAGLINE": {
                    "LABEL": "Welcome Tagline",
                    "PLACEHOLDER": "We make it simple to connect with us. Ask us anything, or share your feedback."
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
                    "HELP_TEXT": "This reply time will be displayed on the live chat widget"
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
                        "DESCRIPTION": "Connect a new number or an existing number from the WhatsApp Business app without manual configuration. To request this option, tell our team what your business does, how you’ll use WhatsApp, and which Chatwoot account needs access.",
                        "FOOTNOTE": "We’ll review your request and let you know if this option can be enabled. You can also continue with manual setup below.",
                        "BUTTON": "Request access"
                    },
                    "RESTRICTED_WARNING": "WhatsApp Embedded Signup is temporarily unavailable due to an API-level issue on Meta’s side, not a problem with Chatwoot. You can use manual setup for eligible Cloud API numbers. We’re working closely with Meta to resolve it as quickly as possible.",
                    "STATUS_LINK": "View status updates",
                    "CALLING_ENABLE_FAILED": "Your WhatsApp inbox is ready, but voice calling couldn't be turned on — this number isn't enrolled in the WhatsApp Business Calling API yet. Reach out to Meta or your WhatsApp Business Solution Provider to onboard it, then turn calling on from the inbox's Calls settings."
                },
                "API": {
                    "ERROR_MESSAGE": "We were not able to save the WhatsApp channel",
                    "MANUAL_RESTRICTION_WARNING": "WhatsApp Embedded Signup is temporarily unavailable due to an API-level issue on Meta’s side, not a problem with Chatwoot. Manual setup works only for numbers already connected to WhatsApp Cloud API. Numbers using WhatsApp Business app coexistence are not supported in this flow yet. We’re working closely with Meta to resolve the issue as quickly as possible. Thanks for your patience.",
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
                "DESC": "Chatwoot supports live-chat widgets, Facebook Messenger, WhatsApp, Emails, etc., as channels. If you want to build a custom channel, you can create it using the API channel. To get started, choose one of the channels below.",
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
                        "DESCRIPTION": "Connect with Gmail, Outlook, or other providers"
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
                "DESC": "From the dropdown below, select the Facebook Page you want to connect to Chatwoot. You can also give a custom name to your inbox for better identification."
            },
            "FINISH": {
                "TITLE": "Nailed It!",
                "DESC": "You have successfully finished integrating your Facebook Page with Chatwoot. Next time a customer messages your Page, the conversation will automatically appear on your inbox.<br>We are also providing you with a widget script that you can easily add to your website. Once this is live on your website, customers can message you right from your website without the help of any external tool and the conversation will appear right here, on Chatwoot.<br>Cool, huh? Well, we sure try to be :)"
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
                "VIEW_DOCS": "View documentation",
                "REQUIRE_LABEL": "Require identity validation for all conversations",
                "REQUIRE_DESCRIPTION": "When enabled, users must provide a valid identity token to start conversations. Requests without valid tokens will be rejected."
            },
            "INBOX_AGENTS": "Agents",
            "INBOX_AGENTS_SUB_TEXT": "Add or remove agents from this inbox",
            "AGENT_ASSIGNMENT": "Conversation Assignment",
            "AGENT_ASSIGNMENT_SUB_TEXT": "Update conversation assignment settings",
            "UPDATE": "Update",
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
            "ALLOW_MESSAGES_AFTER_RESOLVED_SUB_TEXT": "Allow the end-users to send messages even after the conversation is resolved.",
            "WHATSAPP_SECTION_SUBHEADER": "This API Key is used for the integration with the WhatsApp APIs.",
            "WHATSAPP_SECTION_UPDATE_SUBHEADER": "Enter the new API key to be used for the integration with the WhatsApp APIs.",
            "WHATSAPP_SECTION_TITLE": "API Key",
            "WHATSAPP_SECTION_UPDATE_TITLE": "Update API Key",
            "WHATSAPP_SECTION_UPDATE_PLACEHOLDER": "Enter the new API Key here",
            "WHATSAPP_SECTION_UPDATE_BUTTON": "Update",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_ADD_TITLE": "Add Business Management Token",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_REPLACE_TITLE": "Replace Business Management Token",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_CONFIGURED": "Business management token configured",
            "WHATSAPP_BUSINESS_MANAGEMENT_TOKEN_UPDATE_SUBHEADER": "Provide a token with access to this WhatsApp Business Account when Chatwoot cannot retrieve its message templates. Chatwoot uses this token only for template synchronization.",
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
                    "VERIFY_NOTICE": "Chatwoot will verify these credentials with Meta before applying any changes. If verification fails, the current configuration is left untouched.",
                    "BACK": "Back",
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
                        "DESCRIPTION": "Confirm the connection details before reconnecting this inbox. Chatwoot will verify the token, WABA, and phone number with Meta before applying changes."
                    }
                }
            },
            "WHATSAPP_CALLING_ENABLED": {
                "LABEL": "Enable voice calling",
                "DESCRIPTION": "Allow agents to start and receive WhatsApp voice calls on this inbox. Available only on embedded-signup WhatsApp Cloud channels with calling permission granted by Meta."
            },
            "UPDATE_PRE_CHAT_FORM_SETTINGS": "Update Pre Chat Form Settings"
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
                "PLACEHOLDER": "This message would be visible to the users along with the form"
            },
            "REQUIRE_EMAIL": {
                "LABEL": "Visitors should provide their name and email address before starting the chat"
            }
        },
        "CSAT": {
            "TITLE": "Enable CSAT",
            "SUBTITLE": "Automatically trigger CSAT surveys at the end of conversations to understand how customers feel about their support experience. Track satisfaction trends and identify areas for improvement over time.",
            "DISPLAY_TYPE": {
                "LABEL": "Display type"
            },
            "MESSAGE": {
                "LABEL": "Message",
                "PLACEHOLDER": "Please enter a message to show users with the form"
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
            "UPDATE": "Update business hours settings",
            "TOGGLE_AVAILABILITY": "Enable business availability for this inbox",
            "UNAVAILABLE_MESSAGE_LABEL": "Unavailable message for visitors",
            "TOGGLE_HELP": "Enabling business availability will show the available hours on live chat widget even if all the agents are offline. Outside available hours visitors can be warned with a message and a pre-chat form.",
            "DAY": {
                "DAY": "Day",
                "AVAILABILITY": "Availability",
                "HOURS": "Hours",
                "ENABLE": "Enable availability for this day",
                "UNAVAILABLE": "Unavailable",
                "VALIDATION_ERROR": "Starting time should be before closing time.",
                "CHOOSE": "Choose"
            },
            "ALL_DAY": "All-Day"
        },
        "IMAP": {
            "TITLE": "IMAP",
            "SUBTITLE": "Set your IMAP details",
            "NOTE_TEXT": "To enable SMTP, please configure IMAP.",
            "UPDATE": "Update IMAP settings",
            "TOGGLE_AVAILABILITY": "Enable IMAP configuration for this inbox",
            "TOGGLE_HELP": "Enabling IMAP will help the user to receive email",
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
            "TOGGLE_HELP": "Enabling SMTP will help the user to send email",
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
            "OPEN_SSL_VERIFY_MODE": "Open SSL Verify Mode",
            "AUTH_MECHANISM": "Authentication"
        },
        "NOTE": "Note: ",
        "WIDGET_BUILDER": {
            "WIDGET_OPTIONS": {
                "AVATAR": {
                    "LABEL": "Website Avatar",
                    "DELETE": {
                        "API": {
                            "SUCCESS_MESSAGE": "Avatar deleted successfully",
                            "ERROR_MESSAGE": "There was an error, please try again"
                        }
                    }
                },
                "WEBSITE_NAME": {
                    "LABEL": "Website Name",
                    "PLACE_HOLDER": "Enter your website name (eg: Acme Inc)",
                    "ERROR": "Please enter a valid website name"
                },
                "WELCOME_HEADING": {
                    "LABEL": "Welcome Heading",
                    "PLACE_HOLDER": "Hi there!"
                },
                "WELCOME_TAGLINE": {
                    "LABEL": "Welcome Tagline",
                    "PLACE_HOLDER": "We make it simple to connect with us. Ask us anything, or share your feedback."
                },
                "REPLY_TIME": {
                    "LABEL": "Reply Time",
                    "IN_A_FEW_MINUTES": "In a few minutes",
                    "IN_A_FEW_HOURS": "In a few hours",
                    "IN_A_DAY": "In a day"
                },
                "WIDGET_COLOR_LABEL": "Widget Color",
                "WIDGET_BUBBLE": "Bubble",
                "WIDGET_BUBBLE_POSITION_LABEL": "Position:",
                "WIDGET_BUBBLE_TYPE_LABEL": "Type:",
                "WIDGET_BUBBLE_LAUNCHER_TITLE": {
                    "DEFAULT": "Chat with us",
                    "LABEL": "Launcher Title",
                    "PLACE_HOLDER": "Chat with us"
                },
                "UPDATE": {
                    "BUTTON_TEXT": "Update Widget Settings",
                    "API": {
                        "SUCCESS_MESSAGE": "Widget settings updated successfully",
                        "ERROR_MESSAGE": "Unable to update widget settings"
                    }
                },
                "WIDGET_VIEW_OPTION": {
                    "PREVIEW": "Preview",
                    "SCRIPT": "Script"
                },
                "WIDGET_BUBBLE_POSITION": {
                    "LEFT": "Left",
                    "RIGHT": "Right"
                },
                "WIDGET_BUBBLE_TYPE": {
                    "STANDARD": "Standard",
                    "EXPANDED_BUBBLE": "Expanded Bubble"
                }
            },
            "WIDGET_SCREEN": {
                "DEFAULT": "Default",
                "CHAT": "Chat mode"
            },
            "REPLY_TIME": {
                "IN_A_FEW_MINUTES": "Typically replies in a few minutes",
                "IN_A_FEW_HOURS": "Typically replies in a few hours",
                "IN_A_DAY": "Typically replies in a day"
            },
            "FOOTER": {
                "START_CONVERSATION_BUTTON_TEXT": "Start Conversation",
                "CHAT_INPUT_PLACEHOLDER": "Type your message"
            },
            "BODY": {
                "TEAM_AVAILABILITY": {
                    "ONLINE": "We are Online",
                    "OFFLINE": "We are away at the moment"
                },
                "USER_MESSAGE": "Hi",
                "AGENT_MESSAGE": "Hello"
            },
            "BRANDING_TEXT": "Powered by Chatwoot",
            "SCRIPT_SETTINGS": "\n      window.chatwootSettings = {options};"
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
            "VOICE": "Voice"
        }
    },
    "INTEGRATION_SETTINGS": {
        "OPEN_AI": {
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
            }
        }
    },
    "KEYBOARD_SHORTCUTS": {
        "TOGGLE_MODAL": "View all shortcuts",
        "TITLE": {
            "OPEN_CONVERSATION": "Open conversation",
            "RESOLVE_AND_NEXT": "Resolve and move to next",
            "NAVIGATE_DROPDOWN": "Navigate dropdown items",
            "RESOLVE_CONVERSATION": "Resolve Conversation",
            "GO_TO_CONVERSATION_DASHBOARD": "Go to Conversation Dashboard",
            "ADD_ATTACHMENT": "Add Attachment",
            "GO_TO_CONTACTS_DASHBOARD": "Go to Contacts Dashboard",
            "TOGGLE_SIDEBAR": "Toggle Sidebar",
            "GO_TO_REPORTS_SIDEBAR": "Go to Reports sidebar",
            "MOVE_TO_NEXT_TAB": "Move to next tab in conversation list",
            "GO_TO_SETTINGS": "Go to Settings",
            "SWITCH_TO_PRIVATE_NOTE": "Switch to Private Note",
            "SWITCH_TO_REPLY": "Switch to Reply",
            "TOGGLE_SNOOZE_DROPDOWN": "Toggle snooze dropdown"
        }
    },
    "LABEL": {
        "TAG_BUTTON": "tag"
    },
    "LOGIN": {
        "TITLE": "Login to Chatwoot",
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
            "ERROR_MESSAGE": "Could not connect to Woot server. Please try again.",
            "UNAUTH": "Username or password is incorrect. Please try again."
        },
        "OAUTH": {
            "GOOGLE_LOGIN": "Login with Google",
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
    "MERGE_CONTACTS": {
        "TITLE": "Merge contacts",
        "DESCRIPTION": "Merge contacts to combine two profiles into one, including all attributes and conversations. In case of conflict, the Primary contact’s attributes will take precedence.",
        "PRIMARY": {
            "TITLE": "Primary contact",
            "HELP_LABEL": "To be deleted"
        },
        "PARENT": {
            "TITLE": "Contact to merge",
            "PLACEHOLDER": "Search for a contact",
            "HELP_LABEL": "To be kept"
        },
        "SUMMARY": {
            "TITLE": "Summary",
            "DELETE_WARNING": "Contact of <strong>{primaryContactName}</strong> will be deleted.",
            "ATTRIBUTE_WARNING": "Contact details of <strong>{primaryContactName}</strong> will be copied to <strong>{parentContactName}</strong>."
        },
        "SEARCH": {
            "ERROR_MESSAGE": "Something went wrong. Please try again later."
        },
        "FORM": {
            "SUBMIT": " Merge contacts",
            "CANCEL": "Cancel",
            "CHILD_CONTACT": {
                "ERROR": "Select a child contact to merge"
            },
            "SUCCESS_MESSAGE": "Contact merged successfully",
            "ERROR_MESSAGE": "Could not merge contacts, try again!"
        },
        "DROPDOWN_ITEM": {
            "ID": "(ID: {identifier})"
        }
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
        "NO_INBOX": "Couldn't find an inbox to initiate a new conversation with this contact.",
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
    "ONBOARDING": {
        "TITLE": "Hey 👋, Welcome to {installationName}!",
        "DESCRIPTION": "Thanks for signing up. We want you to get the most out of {installationName}. Here are a few things you can do in {installationName} to make the experience delightful.",
        "GREETING_MORNING": "👋 Good morning, {name}. Welcome to {installationName}.",
        "GREETING_AFTERNOON": "👋 Good afternoon, {name}. Welcome to {installationName}.",
        "GREETING_EVENING": "👋 Good evening, {name}. Welcome to {installationName}.",
        "READ_LATEST_UPDATES": "Read our latest updates",
        "ALL_CONVERSATION": {
            "TITLE": "All your conversations in one place",
            "DESCRIPTION": "View all the conversations from your customers in one single dashboard. You can filter the conversations by the incoming channel, label and status.",
            "NEW_LINK": "Click here to create an inbox"
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
            "MESSAGE": "Inbox setup for Facebook, Instagram, and WhatsApp is temporarily unavailable due to an API-level issue on Meta’s side, not a problem with Chatwoot. We’re working closely with Meta to resolve it as quickly as possible.",
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
            "YOUR_ROLE": "Your Role",
            "WEBSITE": "Website",
            "LANGUAGE": "Language",
            "TIMEZONE": "Timezone",
            "COMPANY_SIZE": "Company Size",
            "INDUSTRY": "Industry",
            "REFERRAL_SOURCE": "Where did you find us?"
        },
        "PLACEHOLDERS": {
            "SELECT_ROLE": "Select your role",
            "ENTER_WEBSITE": "www.example.com",
            "SELECT_LANGUAGE": "Select language",
            "SELECT_TIMEZONE": "Select timezone",
            "SELECT_COMPANY_SIZE": "Select company size",
            "SELECT_INDUSTRY": "Select industry",
            "SELECT_REFERRAL_SOURCE": "Select source"
        },
        "EMAIL_VERIFIED": "Email verified",
        "SETTING_UP": "Setting up your account...",
        "CONTINUE": "Continue",
        "SAVING": "Saving...",
        "VALIDATION_ERROR": "Please fill in all required fields",
        "SUCCESS": "Details saved successfully",
        "ERROR": "Could not save details. Please try again."
    },
    "PAGINATION_FOOTER": {
        "SHOWING": "Showing {startItem} - {endItem} of {totalItems} item | Showing {startItem} - {endItem} of {totalItems} items",
        "CURRENT_PAGE_INFO": "{currentPage} of {totalPages} page | {currentPage} of {totalPages} pages"
    },
    "PHONE_INPUT": {
        "SEARCH_PLACEHOLDER": "Search country",
        "ERROR": "Phone number should be empty or in E.164 format",
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
                "NOTE": "Customize the look and feel of your Chatwoot dashboard.",
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
                "BROWSER_PERMISSION": "Enable push notifications for your browser so you’re able to receive them"
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
    "REGISTER": {
        "TRY_WOOT": "Create an account",
        "GET_STARTED": "Get started with Chatwoot",
        "TITLE": "Register",
        "TESTIMONIAL_HEADER": "All it takes is one step to move forward",
        "TESTIMONIAL_CONTENT": "You're one step away from engaging your customers, retaining them and finding new ones.",
        "TERMS_ACCEPT": "By creating an account, you agree to our <a href=\"https://www.chatwoot.com/terms\">T & C</a> and <a href=\"https://www.chatwoot.com/privacy-policy\">Privacy policy</a>",
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
            "ERROR_MESSAGE": "Could not connect to Woot server. Please try again."
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
    "RESET_PASSWORD": {
        "TITLE": "Reset password",
        "DESCRIPTION": "Enter the email address you use to log in to Chatwoot to get the password reset instructions.",
        "GO_BACK_TO_LOGIN": "If you want to go back to the login page,",
        "EMAIL": {
            "LABEL": "Email",
            "PLACEHOLDER": "Please enter your email.",
            "ERROR": "Please enter a valid email."
        },
        "API": {
            "SUCCESS_MESSAGE": "Password reset link has been sent to your email.",
            "ERROR_MESSAGE": "Could not connect to Woot server. Please try again."
        },
        "SUBMIT": "Submit"
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
                "TOOLTIP": "Unique identifier for Chatwoot as the Service Provider - Configure this in your IdP settings"
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
            "ERROR_MESSAGE": "Could not connect to Woot server. Please try again."
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
    "SIDEBAR": {
        "NO_ITEMS": "No items",
        "CURRENTLY_VIEWING_ACCOUNT": "Currently viewing:",
        "SWITCH": "Switch",
        "INBOX_VIEW": "Inbox View",
        "CONVERSATIONS": "Conversations",
        "INBOX": "My Inbox",
        "ALL_CONVERSATIONS": "All Conversations",
        "MENTIONED_CONVERSATIONS": "Mentions",
        "PARTICIPATING_CONVERSATIONS": "Participating",
        "UNATTENDED_CONVERSATIONS": "Unattended",
        "REPORTS": "Reports",
        "SETTINGS": "Settings",
        "CONTACTS": "Contacts",
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
        "CUSTOM_ATTRIBUTES": "Custom Attributes",
        "AUTOMATION": "Automation",
        "MACROS": "Macros",
        "TEAMS": "Teams",
        "BILLING": "Billing",
        "CUSTOM_VIEWS_FOLDER": "Folders",
        "CUSTOM_VIEWS_SEGMENTS": "Segments",
        "ALL_CONTACTS": "All Contacts",
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
        "APPEARANCE": "Change appearance",
        "SUPER_ADMIN_CONSOLE": "SuperAdmin console",
        "DOCS": "Read documentation",
        "CHANGELOG": "Changelog",
        "LOGOUT": "Log out"
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
    "SWITCH": {
        "TOGGLE": "Toggle switch"
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
    }
};

export default messages;
