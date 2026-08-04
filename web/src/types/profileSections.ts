export interface Experience {
  id: number | string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  logo: string;
}

export interface Education {
  id: number | string;
  degree: string;
  school: string;
  startDate: string;
  endDate: string;
  description: string;
  gpa: string;
}

export interface Skill {
  id: number | string;
  name: string;
  level: number;
  category: string;
}

export interface Achievement {
  id: number | string;
  title: string;
  organization: string;
  date: string;
  type: string;
  description: string;
}
