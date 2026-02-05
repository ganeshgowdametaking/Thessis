export type RootStackParamList = {
    Auth: undefined;
    Main: undefined;
    JobDetails: { job: Job };
};

export type AuthStackParamList = {
    SignIn: undefined;
    SignUp: undefined;
};

export type MainTabParamList = {
    Home: undefined;
    Messages: undefined;
    Notifications: undefined;
    Profile: undefined;
};

export interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    salary: string;
    type: string;
    workType: string;
    logo: string;
    logoBg: string;
    isNew?: boolean;
    isUrgent?: boolean;
}
