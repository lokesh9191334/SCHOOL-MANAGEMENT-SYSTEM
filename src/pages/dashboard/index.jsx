import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'

// Chart data
const earningsData = [
  { name: 'Mon', total: 4000, fees: 2400 },
  { name: 'Tue', total: 3000, fees: 1398 },
  { name: 'Wed', total: 2000, fees: 9800 },
  { name: 'Thu', total: 2780, fees: 3908 },
  { name: 'Fri', total: 1890, fees: 4800 },
  { name: 'Sat', total: 2390, fees: 3800 },
  { name: 'Sun', total: 3490, fees: 4300 },
]

const expensesData = [
  { name: 'Jan 2026', value: 15000 },
  { name: 'Feb 2026', value: 10500 },
  { name: 'Mar 2026', value: 9800 },
  { name: 'Apr 2026', value: 12000 },
  { name: 'May 2026', value: 14500 },
  { name: 'Jun 2026', value: 11200 },
]

const studentsData = [
  { name: 'Active', value: 65000, color: '#3b82f6' },
  { name: 'Inactive', value: 45000, color: '#f59e0b' },
  { name: 'Prospective', value: 40000, color: '#10b981' },
]

const DashboardPage = () => {
  return (
    <div className="new-dashboard">
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="stat-info">
            <p className="stat-label">Students</p>
            <h3 className="stat-value">150,000</h3>
            <p className="stat-change">+12% from last month</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="stat-info">
            <p className="stat-label">Teachers</p>
            <h3 className="stat-value">2,250</h3>
            <p className="stat-change">+5% from last month</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="stat-info">
            <p className="stat-label">Parents</p>
            <h3 className="stat-value">5,690</h3>
            <p className="stat-change">+8% from last month</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          </div>
          <div className="stat-info">
            <p className="stat-label">Earnings</p>
            <h3 className="stat-value">$190,000</h3>
            <p className="stat-change">+18% from last month</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Earnings Area Chart */}
        <div className="chart-card large-chart">
          <div className="chart-header">
            <div>
              <h2 className="chart-title">Earnings Overview</h2>
              <p className="chart-subtitle">Track your total and fees collections</p>
            </div>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-dot blue" />
                Total Collections
              </span>
              <span className="legend-item">
                <span className="legend-dot red" />
                Fees Collections
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={earningsData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorFees" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
              <Area
                type="monotone"
                dataKey="fees"
                stroke="#ef4444"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorFees)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Expenses Bar Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h2 className="chart-title">Monthly Expenses</h2>
              <p className="chart-subtitle">Expense breakdown by month</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={expensesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Bar
                dataKey="value"
                fill="url(#barGradient)"
                radius={[8, 8, 0, 0]}
                barSize={32}
              >
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Students Donut Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h2 className="chart-title">Student Distribution</h2>
              <p className="chart-subtitle">Student status breakdown</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={studentsData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={8}
                dataKey="value"
              >
                {studentsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{ paddingTop: '16px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="bottom-section">
        <div className="bottom-card">
          <div className="bottom-card-header">
            <div className="bottom-card-icon purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h3 className="bottom-card-title">Event Calendar</h3>
          </div>
          <p className="bottom-card-text">Upcoming school events and holidays</p>
          <div className="bottom-card-actions">
            <Link to="/" className="bottom-card-link">
              View All Events →
            </Link>
          </div>
        </div>

        <div className="bottom-card">
          <div className="bottom-card-header">
            <div className="bottom-card-icon cyan">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <h3 className="bottom-card-title">Website Traffic</h3>
          </div>
          <p className="bottom-card-text">Visitor analytics and page views</p>
          <div className="bottom-card-actions">
            <Link to="/" className="bottom-card-link">
              See Analytics →
            </Link>
          </div>
        </div>

        <div className="bottom-card">
          <div className="bottom-card-header">
            <div className="bottom-card-icon pink">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <h3 className="bottom-card-title">Notice Board</h3>
          </div>
          <p className="bottom-card-text">Important announcements and updates</p>
          <div className="bottom-card-actions">
            <Link to="/" className="bottom-card-link">
              Check Notices →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
