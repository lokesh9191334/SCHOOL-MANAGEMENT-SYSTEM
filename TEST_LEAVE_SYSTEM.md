# 🧪 LEAVE SYSTEM TESTING GUIDE

## ✅ **ISSUES FIXED:**

1. **Form Submission** - Now actually submits to server (was only showing alert)
2. **Date Validation** - Fixed to use current year (2026)
3. **Database Integration** - Leave applications now save to database
4. **Redirect** - Teacher automatically redirected to leave status after submission
5. **Loading State** - Button shows loading spinner during submission
6. **Error Handling** - Better error messages and debugging

---

## 🔑 **LOGIN CREDENTIALS:**

### **Admin Account:**
```
📧 Email: admin@school.com
🔑 Password: admin123
👤 Account Type: Administrator
```

### **Test Teacher Account:**
```
📧 Email: teacher@school.com
🔑 Password: teacher123
👤 Account Type: Teacher
🏫 School ID: 12345
```

---

## 🧪 **STEP-BY-STEP TESTING:**

### **Step 1: Test Teacher Leave Submission**

1. **Login as Teacher:**
   - Go to: `http://127.0.0.1:5000/login`
   - Email: `teacher@school.com`
   - Password: `teacher123`
   - Account Type: `Teacher`
   - School ID: `12345`

2. **Go to Leave Application:**
   - Click **"Apply Leave"** in sidebar
   - You should see the premium leave form

3. **Fill the Form:**
   - Click any **Leave Type Card** (it should turn blue)
   - Enter **Start Date**: `2026/01/30`
   - Enter **End Date**: `2026/02/01`
   - Enter **Reason**: `Testing leave application system`
   - Click **"Test"** button to auto-fill (optional)

4. **Submit the Form:**
   - Click **"Submit Application"**
   - Button should show **"Submitting..."** with spinner
   - You should see **"Leave application submitted successfully!"**
   - **Automatically redirected** to Leave Status page

### **Step 2: Verify Leave Status**

1. **Check Leave Status Page:**
   - You should see your submitted leave
   - Status should show **"Pending"**
   - Leave details should be displayed correctly

2. **Check Sidebar:**
   - **"Leave Status"** in sidebar should show your leave
   - Real-time updates should work

### **Step 3: Test Admin Notification**

1. **Login as Admin:**
   - Go to: `http://127.0.0.1:5000/login`
   - Email: `admin@school.com`
   - Password: `admin123`
   - Account Type: `Administrator`

2. **Check Sidebar Badge:**
   - Look at **"Leave Management" → "Teacher Leaves"**
   - You should see a **red badge** with number (e.g., "1")

3. **Go to Teacher Leaves:**
   - Click **"Teacher Leaves"** in sidebar
   - You should see the teacher's leave application
   - Status should be **"Pending"**
   - Details should match teacher's submission

### **Step 4: Test Admin Approval/Rejection**

1. **Approve Leave:**
   - Click **"Approve"** button on the leave
   - Confirm when prompted
   - Page should refresh and status should change to **"Approved"**

2. **Check Teacher Notification:**
   - Login back as teacher
   - You should see notification about approval
   - Leave status should now show **"Approved"**

---

## 🔍 **DEBUGGING TIPS:**

### **If Form Doesn't Submit:**
1. Open **Browser Console** (F12)
2. Look for JavaScript errors
3. Check if all fields are filled correctly
4. Verify dates are in `YYYY/MM/DD` format

### **If Leave Doesn't Appear in Admin:**
1. Check if admin is logged in correctly
2. Verify badge count updates
3. Refresh the page
4. Check browser console for errors

### **If Real-time Updates Don't Work:**
1. Wait 10-15 seconds for updates
2. Check browser console for API errors
3. Verify internet connection
4. Refresh the page manually

---

## 📊 **EXPECTED BEHAVIOR:**

### **Teacher Workflow:**
1. ✅ Submit leave → Gets success message
2. ✅ Auto-redirected to leave status
3. ✅ Sees pending leave immediately
4. ✅ Gets notification when admin processes

### **Admin Workflow:**
1. ✅ Sees badge counter update
2. ✅ Sees new leave in dashboard
3. ✅ Can approve/reject with comments
4. ✅ Teacher gets instant notification

### **Real-time Features:**
1. ✅ Badge counter updates every 10 seconds
2. ✅ Teacher gets notifications every 15 seconds
3. ✅ Admin gets notifications every 30 seconds
4. ✅ No page refresh needed

---

## 🎯 **SUCCESS INDICATORS:**

### **Form Working:**
- [ ] Leave type card turns blue when selected
- [ ] Duration shows automatically when dates entered
- [ ] Submit button shows spinner during submission
- [ ] Success message appears
- [ ] Auto-redirect to leave status page

### **Admin Dashboard Working:**
- [ ] Badge counter shows pending count
- [ ] Teacher Leaves page shows new applications
- [ ] Approve/Reject buttons work
- [ ] Status changes immediately

### **Real-time Updates Working:**
- [ ] Teacher gets notification of status change
- [ ] Leave status updates without page refresh
- [ ] Badge counter updates when new leaves submitted

---

## 🚨 **TROUBLESHOOTING:**

### **Common Issues:**

1. **"Start date cannot be before today"**
   - Use today's date or future date
   - Format: `2026/01/30`

2. **"Please select current year only"**
   - Make sure year is `2026`
   - Don't use `2025` or other years

3. **"All fields are required"**
   - Make sure all fields are filled
   - Select leave type card
   - Reason must be at least 10 characters

4. **Leave not appearing in admin**
   - Wait 10 seconds for real-time update
   - Check badge counter
   - Refresh admin page

---

## ✅ **TEST CHECKLIST:**

- [ ] Teacher can submit leave application
- [ ] Leave appears in teacher status immediately
- [ ] Admin gets notification/badge update
- [ ] Leave appears in admin dashboard
- [ ] Admin can approve/reject leave
- [ ] Teacher gets status update notification
- [ ] Real-time updates work without refresh
- [ ] All form validations work correctly

**🎉 If all these work, your leave system is fully functional!**
