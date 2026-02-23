# 💰 RuaCapital

A comprehensive mutual fund portfolio management platform for financial advisors and their clients. Built with **Next.js 16**, **React 19**, **Supabase**, and **Tailwind CSS**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.1-black)
![React](https://img.shields.io/badge/React-19-blue)
![Supabase](https://img.shields.io/badge/Supabase-Powered-green)

---

## ✨ Features

### 📊 Dashboard & Analytics
- **Portfolio Overview** - Real-time AUM tracking with interactive charts
- **Asset Allocation** - Visual breakdown of investments by fund category
- **Top Holdings** - Quick view of largest positions across clients
- **Market Indices Tracker** - Live tracking of NIFTY, SENSEX, Bank Nifty, IT, Midcap & VIX
- **Quick Stats Cards** - At-a-glance metrics for total AUM, clients, and returns

### 👥 Client Management
- **Add/Remove Clients** - Full CRUD operations with PAN-based identification
- **Client Portfolios** - Detailed holdings view with P&L calculations
- **Investment History** - Complete transaction timeline per client
- **Client Notes** - Add comments and observations for each client
- **CSV Export** - Export client data for reporting

### 💼 Portfolio Features
- **Holdings Management** - Track SIPs and Lumpsum investments
- **P&L Tracking** - Real-time profit/loss calculations using live NAV
- **Fund Comparison Tool** - Compare multiple funds side-by-side
- **Mutual Funds Directory** - Search 40,000+ funds via MFAPI integration

### 🧮 Financial Calculators
- **SIP Calculator** - Plan systematic investment amounts
- **Lumpsum Calculator** - Project one-time investment growth
- **SWP Calculator** - Plan systematic withdrawal strategies
- **Goal Planning** - Calculate investments needed for financial goals

### 📰 Market Intelligence
- **Live Market News** - Curated financial news feed
- **Index Performance** - Real-time market indices tracking
- **NAV Updates** - Automatic daily NAV refresh at 3:30 PM IST

### 🔐 Authentication & Security
- **Supabase Auth** - Secure email/password authentication
- **Role-Based Access** - Admin, Advisor, and Client roles
- **Row Level Security** - Data isolation between advisors
- **Client Portal** - Separate dashboard for clients to view their investments

### 🎨 User Experience
- **Dark/Light Mode** - Full theme system with smooth transitions
- **Global Search** - Cmd+K to search clients, funds, and pages
- **Responsive Design** - Works seamlessly on desktop and mobile
- **Notification System** - In-app alerts for important events
- **Activity History** - Timeline of all actions with filters

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm/yarn/pnpm/bun
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ruacapital.git
   cd ruacapital
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Update `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database**
   - Go to your Supabase Dashboard → SQL Editor
   - Run the contents of `schema.sql` to create all tables and policies

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)** in your browser

---

## 🗄️ Database Schema

The app uses Supabase with the following core tables:

| Table | Description |
|-------|-------------|
| `profiles` | User accounts linked to Supabase Auth |
| `clients` | Client information with PAN, KYC status |
| `holdings` | Investment positions (units, avg price) |
| `transactions` | Buy/Sell/SIP transaction history |
| `sips` | Active SIP registrations |
| `mutual_funds` | Fund master data with NAV |
| `notifications` | In-app notification system |

All tables have Row Level Security (RLS) enabled for data isolation.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Frontend**: [React 19](https://react.dev/) with Server Components
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **API**: [MFAPI.in](https://www.mfapi.in/) for mutual fund data

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── admin-dashboard/    # Advisor dashboard
│   ├── client-dashboard/   # Client portal
│   ├── calculators/        # Financial calculators
│   ├── clients/            # Client management
│   ├── compare/            # Fund comparison tool
│   ├── manage/             # Holdings management
│   ├── mutual-funds/       # Fund directory
│   ├── portfolio/          # Portfolio view
│   ├── history/            # Activity history
│   ├── news/               # Market news
│   └── settings/           # User settings
├── components/             # Reusable React components
├── context/                # React context providers
├── lib/                    # Utility functions
└── types/                  # TypeScript type definitions
```

---

## 🔧 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [MFAPI.in](https://www.mfapi.in/) for providing free mutual fund APIs
- [Supabase](https://supabase.com/) for the amazing backend platform
- [Vercel](https://vercel.com/) for hosting and Next.js

---

<p align="center">Made with ❤️ for the Indian Mutual Fund Industry</p>
