# CloudPrep AI

**Your AI-powered companion for Microsoft Azure Fundamentals (AZ-900) exam preparation.**

## About the Project

CloudPrep AI is an AI-powered learning platform designed to help learners prepare for the Microsoft Azure Fundamentals (AZ-900) certification exam. It aims to make studying easier, more interactive, and more personalized through AI-assisted learning tools, practice questions, study planning, and progress tracking.

The platform brings learning resources together in one place, helping learners understand cloud computing concepts, revise important topics, and build confidence before taking the exam.

**Note:** CloudPrep AI is an independent educational project. It is not affiliated with or endorsed by Microsoft.

## Objectives

- Make AZ-900 exam preparation more accessible and engaging.
- Help learners understand Azure and cloud computing concepts.
- Provide personalized study support through AI-powered tools.
- Allow learners to practice questions and assess their readiness.
- Help users organize their studies and track their learning progress.

## Key Features

- **AI Study Assistant:** Get help understanding cloud computing and Azure concepts.
- **Personalized Study Plan:** Organize study sessions around your learning goals.
- **Study Notes:** Create and manage notes for revision.
- **Study Calendar:** Plan and organize learning activities.
- **Practice Quizzes:** Test your knowledge with AZ-900-related questions.
- **Flashcards:** Revise important terms, definitions, and concepts.
- **Practice Tests:** Simulate exam-style practice sessions.
- **Visual Learning:** Support understanding through visual explanations.
- **Progress Tracking:** Monitor learning activity and quiz performance.
- **AI Tutor:** Receive guided explanations and assistance with difficult topics.

*Feature availability may vary as development progresses.*

## Technologies Used

- **Frontend:** React, TypeScript, Vite
- **Database:** PostgreSQL
- **Backend and Authentication:** Supabase
- **Styling:** CSS and the styling tools configured in the project
- **Development Tools:** Visual Studio Code, Git, and GitHub

## Getting Started

### Prerequisites

Ensure you have the following installed:

- Node.js
- npm
- Git
- A Supabase account

### Installation

1. Clone the repository:

   ```bash
   git clone <your-github-repository-url>
   ```

2. Navigate to the project directory:

   ```bash
   cd <your-project-folder>
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Create a `.env` file in the project root and configure your Supabase credentials:

   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
   ```

   Replace the placeholder values with your project's actual Supabase URL and publishable key.

5. Configure the database by running the SQL migration in `supabase/migrations/001_core_schema.sql` using the Supabase SQL Editor, if this migration has not already been applied.

6. Start the development server:

   ```bash
   npm run dev
   ```

7. Open the local URL displayed in your terminal to access the application.

##Environment Variables

The project uses environment variables to configure the Supabase connection.

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Identifies the Supabase project |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Allows the frontend to connect using the project's publishable key |

**Security:** Never commit your `.env` file or expose a Supabase secret or `service_role` key in frontend code. Use appropriate Row Level Security (RLS) policies to protect database records.

##Project Structure

```text
cloudprep/
├── src/
│   ├── lib/
│   │   ├── auth.tsx
│   │   └── supabase.ts
│   └── ...
├── supabase/
│   └── migrations/
│       └── 001_core_schema.sql
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

*This is an illustrative structure. Update it to reflect the actual files and folders in your repository.*

## Testing

Testing will cover the main user flows, including:

- Application startup and navigation.
- Supabase connectivity.
- Authentication, if enabled.
- Saving and retrieving study data.
- Generating and completing practice quizzes.
- Recording and displaying learning progress.

## 🔮 Future Improvements

- Add more personalized AI-generated study recommendations.
- Expand the question bank across the AZ-900 exam domains.
- Introduce interactive cloud learning games.
- Add visual explanations and short educational videos.
- Improve progress analytics and exam-readiness insights.
- Optimize the experience for mobile devices.

## Contributing

Contributions, suggestions, and bug reports are welcome. Fork the repository, create a feature branch, make your changes, and submit a pull request.

##License

Choose and add an appropriate open-source license before distributing the project. Until a license is added, reuse and redistribution permissions are not automatically granted.

---

**Built to make cloud learning simpler, smarter, and more engaging.**
