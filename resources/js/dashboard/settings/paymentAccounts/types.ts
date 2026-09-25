export interface BankOption {
    bin: string;
    code: string;
    short_name: string;
    name: string;
}

export interface PaymentAccount {
    id: number;
    bank_bin: string;
    bank_code: string;
    bank_name: string;
    account_number: string;
    account_name: string;
    memo_template: string | null;
    is_default: boolean;
    allow_all_agents: boolean;
}

export interface PaymentAccountFormValues {
    bank_bin: string;
    account_number: string;
    account_name: string;
    memo_template: string;
    is_default: boolean;
    allow_all_agents: boolean;
}
