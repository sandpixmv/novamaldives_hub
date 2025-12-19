import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Users, FileCheck, AlertCircle, Filter, Calendar, User, Clock } from 'lucide-react';

const MOCK_ADMIN_DATA = {
  totalUsers: 12,
  totalShifts: 145,
  pendingChecklists: 8,
  completedChecklists: 137,
  completionByShift: [
    { name: 'Morning', completed: 45, pending: 2 },
    { name: 'Afternoon', completed: 48, pending: 3 },
    { name: 'Night', completed: 44, pending: 3 },
  ],
  recentActivity: [
    { id: 1, user: 'Ahmed R.', shift: 'Morning', date: '2023-10-24', status: 'In Progress', progress: 65 },
    { id: 2, user: 'Ahmed Ihsaan', shift: 'Night', date: '2023-10-23', status: 'Completed', progress: 100 },
    { id: 3, user: 'John D.', shift: 'Afternoon', date: '2023-10-23', status: 'Completed', progress: 100 },
    { id: 4, user: 'Fatima L.', shift: 'Morning', date: '2023-10-23', status: 'Completed', progress: 100 },
    { id: 5, user: 'Ahmed R.', shift: 'Night', date: '2023-10-22', status: 'Pending Review', progress: 95 },
  ]
};

const COLORS = ['#008B8B', '#FF7F50'];

export const AdminDashboard: React.FC = () => {
  const [filterDate, setFilterDate] = useState('');
  const [filterShift, setFilterShift] = useState('All');
  const [filterUser, setFilterUser] = useState('All');

  const pieData = [
    { name: 'Completed', value: MOCK_ADMIN_DATA.completedChecklists },
    { name: 'Pending', value: MOCK_ADMIN_DATA.pendingChecklists },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
        <div>
           <label className="text-xs font-semibold text-gray-500 mb-1 block">Date</label>
           <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
             <Calendar size={16} className="text-gray-400" />
             <input 
               type="date" 
               className="bg-transparent text-sm focus:outline-none text-gray-700"
               value={filterDate}
               onChange={(e) => setFilterDate(e.target.value)}
             />
           </div>
        </div>
        
        <div>
           <label className="text-xs font-semibold text-gray-500 mb-1 block">Shift</label>
           <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 min-w-[150px]">
             <Clock size={16} className="text-gray-400" />
             <select 
               className="bg-transparent text-sm focus:outline-none text-gray-700 w-full"
               value={filterShift}
               onChange={(e) => setFilterShift(e.target.value)}
             >
               <option value="All">All Shifts</option>
               <option value="Morning">Morning</option>
               <option value="Afternoon">Afternoon</option>
               <option value="Night">Night</option>
             </select>
           </div>
        </div>

        <div>
           <label className="text-xs font-semibold text-gray-500 mb-1 block">User</label>
           <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 min-w-[150px]">
             <User size={16} className="text-gray-400" />
             <select 
               className="bg-transparent text-sm focus:outline-none text-gray-700 w-full"
               value={filterUser}
               onChange={(e) => setFilterUser(e.target.value)}
             >
               <option value="All">All Users</option>
               <option value="Ahmed R.">Ahmed R.</option>
               <option value="Ahmed Ihsaan">Ahmed Ihsaan</option>
               <option value="John D.">John D.</option>
             </select>
           </div>
        </div>
        
        <button className="bg-nova-teal text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors ml-auto flex items-center gap-2">
            <Filter size={16} /> Apply Filters
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-2xl font-bold text-gray-800">{MOCK_ADMIN_DATA.totalUsers}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
            <FileCheck size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Shifts</p>
            <p className="text-2xl font-bold text-gray-800">{MOCK_ADMIN_DATA.totalShifts}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-full">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-gray-800">{MOCK_ADMIN_DATA.pendingChecklists}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
            <div className="p-3 bg-teal-50 text-nova-teal rounded-full">
                <Filter size={24} />
            </div>
            <div>
                <p className="text-sm text-gray-500">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-800">94%</p>
            </div>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <h3 className="text-lg font-bold text-gray-800 mb-4">Checklist Status Overview</h3>
             {/* Wrapper Div - ensures clean measurement by Recharts */}
             <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <h3 className="text-lg font-bold text-gray-800 mb-4">Completion by Shift Type</h3>
             {/* Wrapper Div - ensures clean measurement by Recharts */}
             <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={MOCK_ADMIN_DATA.completionByShift}>
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Legend />
                        <Bar dataKey="completed" name="Completed" fill="#008B8B" radius={[4, 4, 0, 0]} barSize={40} />
                        <Bar dataKey="pending" name="Pending" fill="#FF7F50" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Recent Shift Activity</h3>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                          <th className="px-6 py-3 font-medium">Date</th>
                          <th className="px-6 py-3 font-medium">GSA Name</th>
                          <th className="px-6 py-3 font-medium">Shift</th>
                          <th className="px-6 py-3 font-medium">Progress</th>
                          <th className="px-6 py-3 font-medium">Status</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                      {MOCK_ADMIN_DATA.recentActivity.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 text-gray-600">{item.date}</td>
                              <td className="px-6 py-4 font-medium text-gray-800">{item.user}</td>
                              <td className="px-6 py-4">
                                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                      item.shift === 'Morning' ? 'bg-orange-100 text-orange-700' :
                                      item.shift === 'Afternoon' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-indigo-100 text-indigo-700'
                                  }`}>
                                      {item.shift}
                                  </span>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="w-24 bg-gray-200 rounded-full h-1.5">
                                      <div className="bg-nova-teal h-1.5 rounded-full" style={{ width: `${item.progress}%` }}></div>
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                   <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                      item.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                      item.status === 'Pending Review' ? 'bg-red-100 text-red-700' :
                                      'bg-blue-100 text-blue-700'
                                  }`}>
                                      {item.status}
                                  </span>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};