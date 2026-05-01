import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { 
    Users, FolderGit2, Megaphone, PlusCircle, History, Banknote, 
    FilePlus, CheckCircle, XCircle, Eye, Building, FileText, HelpCircle // 1. I-IMPORT ANG HELP ICON
} from 'lucide-react';
import SystemStatus from '@/Components/SystemStatus';
import {
    ResponsiveTable,
    ResponsiveTableBody,
    ResponsiveTableCell,
    ResponsiveTableEmpty,
    ResponsiveTableHead,
    ResponsiveTableHeaderCell,
    ResponsiveTableRow,
} from '@/Components/ResponsiveTable';

// 2. I-IMPORT ANG DRIVER.JS
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

// --- Reusable UI Components ---
const StatCard = ({ icon: Icon, title, value, color }) => (
    <div className="relative overflow-hidden bg-white/70 dark:bg-gray-800/60 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-blue-500/20 hover:-translate-y-1 transition-all duration-300">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
            </div>
            <div className={`p-3 rounded-full ${color.bg} ${color.text}`}>
                <Icon size={24} />
            </div>
        </div>
    </div>
);

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
        <p className="label font-semibold text-gray-800 dark:text-gray-200">{`Requests: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};


// --- Main Dashboard Component ---
export default function AdminDashboard({ 
    auth, 
    stats = [], 
    pendingRequests = [], 
    documentBreakdown = [], 
    recentActivities = [] 
}) {
    const [chartTimeframe, setChartTimeframe] = useState('Weekly');
    const chartData = {
        Weekly: [ { name: 'Mon', reqs: 12 }, { name: 'Tue', reqs: 19 }, { name: 'Wed', reqs: 15 }, { name: 'Thu', reqs: 25 }, { name: 'Fri', reqs: 22 }, { name: 'Sat', reqs: 32 }, { name: 'Sun', reqs: 28 } ],
        Monthly: [ { name: 'Week 1', reqs: 88 }, { name: 'Week 2', reqs: 110 }, { name: 'Week 3', reqs: 140 }, { name: 'Week 4', reqs: 125 } ]
    };

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const iconMap = {
        'Users': Users,
        'FolderGit': FolderGit2,
        'Banknote': Banknote,
        'Building': Building
    };

    const quickActions = [
        { label: "View Requests", icon: FilePlus, href: route('admin.request') },
        { label: "Announcements", icon: Megaphone, href: route('admin.announcements.index') },
        { label: "Manage Documents", icon: PlusCircle, href: route('admin.documents') },
        { label: "View History", icon: History, href: route('admin.history') },
    ];
     
    const notificationIcons = {
        request_completed: CheckCircle,
        request_rejected: XCircle,
        default: FileText,
    };
    
    const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#a5b4fc'];
    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
    const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };
    
    // 3. IDAGDAG ANG TOUR LOGIC
    const startTour = () => {
        const driverObj = driver({
            showProgress: true,
            popoverClass: 'driverjs-theme', // Gamitin ang theme class mula sa iyong layout
            steps: [
                { element: '#dashboard-header', popover: { title: 'Welcome!', description: 'This is your main dashboard, providing a high-level overview of your system\'s activity.' } },
                { element: '#stats-cards', popover: { title: 'Key Statistics', description: 'These cards show your most important metrics at a glance, like total residents and pending requests.' } },
                { element: '#quick-actions', popover: { title: 'Quick Actions', description: 'Use these buttons for quick access to common tasks like viewing requests or creating announcements.' } },
                { element: '#pending-requests-card', popover: { title: 'Pending Requests', description: 'This table shows the most recent requests that require your immediate attention.' } },
                { element: '#document-breakdown-card', popover: { title: 'Document Breakdown', description: 'This chart visualizes which documents are most frequently requested.' } },
                { element: '#recent-activity-card', popover: { title: 'Recent Activity', description: 'This feed shows the latest completed or rejected requests processed by the admin team.' } },
                { element: '#request-volume-chart', popover: { title: 'Request Volume', description: 'This chart tracks the volume of document requests over time, helping you identify trends.' } }
            ]
        });
        driverObj.drive();
    };

    return (
        <AuthenticatedLayout user={auth.user} >
            <Head title="Admin Dashboard" />
            
            <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden">
                <div className="absolute top-0 -left-4 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-16 -right-4 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-3xl animate-pulse delay-1000"></div>
            </div>

            <motion.div className="max-w-screen-xl mx-auto sm:px-6 lg:px-8 py-8" variants={containerVariants} initial="hidden" animate="visible">
                <motion.div variants={itemVariants} className="mb-8">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6" id="dashboard-header">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white">Welcome Back, {auth.user.full_name}!</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">{today}</p>
                        </div>
                        {/* 4. IDAGDAG ANG TOUR BUTTON DITO */}
                        <div className="flex items-center gap-2 md:shrink-0">
                             <SystemStatus />
                             <button onClick={startTour} className="p-2 rounded-lg bg-white/70 dark:bg-gray-800/60 backdrop-blur-sm text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Start Tour">
                                 <HelpCircle size={20} />
                             </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="quick-actions">
                        {quickActions.map(action => (
                            <Link key={action.label} href={action.href} className="flex items-center justify-center gap-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm p-4 rounded-xl shadow-md hover:shadow-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-all">
                                <action.icon className="text-blue-600 dark:text-blue-400" size={20}/>
                                <span className="font-medium text-sm text-gray-800 dark:text-gray-200">{action.label}</span>
                            </Link>
                        ))}
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 flex flex-col gap-8">
                        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6" id="stats-cards">
                            {stats.map((stat, index) => {
                                const IconComponent = iconMap[stat.icon];
                                if (!IconComponent) {
                                    return <StatCard key={index} icon={FileText} {...stat} title={`Unknown Icon: ${stat.title}`} />;
                                }
                                return <StatCard key={index} icon={IconComponent} {...stat} />;
                            })}
                        </motion.div>

                        <motion.div variants={itemVariants} className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-sm p-6 rounded-2xl shadow-lg" id="pending-requests-card">
                             <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 text-lg">Action Required: Pending Requests</h3>
                             <ResponsiveTable>
                                 <ResponsiveTableHead className="bg-transparent text-gray-500 dark:text-gray-400">
                                     <tr>
                                         <ResponsiveTableHeaderCell>Resident</ResponsiveTableHeaderCell>
                                         <ResponsiveTableHeaderCell>Document</ResponsiveTableHeaderCell>
                                         <ResponsiveTableHeaderCell>Date</ResponsiveTableHeaderCell>
                                         <ResponsiveTableHeaderCell className="text-center">Actions</ResponsiveTableHeaderCell>
                                     </tr>
                                 </ResponsiveTableHead>
                                 <ResponsiveTableBody>
                                     {pendingRequests.length > 0 ? pendingRequests.map(req => (
                                         <ResponsiveTableRow key={req.id} className="md:border-t md:border-gray-200 md:dark:border-gray-700">
                                             <ResponsiveTableCell label="Resident" className="font-medium text-gray-800 dark:text-gray-200">
                                                 {req.name}
                                             </ResponsiveTableCell>
                                             <ResponsiveTableCell label="Document" className="text-gray-600 dark:text-gray-300">
                                                 {req.docType}
                                             </ResponsiveTableCell>
                                             <ResponsiveTableCell label="Date" className="text-gray-500 dark:text-gray-400">
                                                 {req.date}
                                             </ResponsiveTableCell>
                                             <ResponsiveTableCell label="Actions" className="md:text-center" contentClassName="flex justify-end md:justify-center">
                                                 <Link href={route('admin.request')} className="inline-flex rounded-md p-2 text-gray-500 transition-colors hover:text-blue-600">
                                                     <Eye size={16}/>
                                                 </Link>
                                             </ResponsiveTableCell>
                                         </ResponsiveTableRow>
                                     )) : (
                                         <ResponsiveTableEmpty colSpan="4">
                                             No pending requests found.
                                         </ResponsiveTableEmpty>
                                     )}
                                 </ResponsiveTableBody>
                             </ResponsiveTable>
                        </motion.div>
                    </div>

                    <div className="lg:col-span-1 flex flex-col gap-8">
                        <motion.div variants={itemVariants} className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-sm p-6 rounded-2xl shadow-lg" id="document-breakdown-card">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Document Breakdown</h3>
                            <div className="h-56 w-full">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={documentBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={70} fill="#8884d8" paddingAngle={5}>
                                            {documentBreakdown.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-sm p-6 rounded-2xl shadow-lg" id="recent-activity-card">
                             <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activity</h3>
                             <ul className="space-y-4">
                                {recentActivities.length > 0 ? recentActivities.map((activity) => {
                                    const Icon = notificationIcons[activity.type] || notificationIcons.default;
                                    const actionText = activity.status === 'Claimed' ? 'approved' : 'rejected';
                                    const iconColor = activity.status === 'Claimed' ? 'text-green-500' : 'text-red-500';

                                    return (
                                        <li key={activity.id} className="flex items-start gap-4">
                                            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                                                <Icon className={iconColor} size={20} />
                                            </div>
                                            <div className="flex-grow">
                                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                                                    <span className="font-semibold text-gray-900 dark:text-white">{activity.processor_name}</span>
                                                    {` ${actionText} the request for `}
                                                    <span className="font-semibold text-gray-900 dark:text-white">{activity.document_name}</span>.
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{activity.time}</p>
                                            </div>
                                        </li>
                                    );
                                }) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No recent activities found.</p>
                                )}
                             </ul>
                        </motion.div>
                    </div>
                </div>

                <motion.div variants={itemVariants} className="mt-8 bg-white/70 dark:bg-gray-800/60 backdrop-blur-sm p-6 rounded-2xl shadow-lg" id="request-volume-chart">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">Request Volume</h3>
                        <div className="flex gap-1 bg-gray-100 dark:bg-gray-900/50 p-1 rounded-lg text-sm">
                            <button onClick={() => setChartTimeframe('Weekly')} className={`px-3 py-1 rounded-md transition-colors ${chartTimeframe === 'Weekly' ? 'bg-white dark:bg-gray-700 shadow' : 'hover:bg-gray-200 dark:hover:bg-gray-700/50'}`}>Weekly</button>
                            <button onClick={() => setChartTimeframe('Monthly')} className={`px-3 py-1 rounded-md transition-colors ${chartTimeframe === 'Monthly' ? 'bg-white dark:bg-gray-700 shadow' : 'hover:bg-gray-200 dark:hover:bg-gray-700/50'}`}>Monthly</button>
                        </div>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData[chartTimeframe]} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs><linearGradient id="colorReqs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                <XAxis dataKey="name" tick={{ fill: 'currentColor' }} className="text-xs text-gray-500" />
                                <YAxis tick={{ fill: 'currentColor' }} className="text-xs text-gray-500" />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="reqs" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorReqs)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </motion.div>
        </AuthenticatedLayout>
    );
}
