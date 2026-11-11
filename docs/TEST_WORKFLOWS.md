# NYO PASTA Live Workflow & Edge Case Testing Guide

This guide is designed for live in-person testing between the developer and the restaurant owner (Wai Yan) to verify all operational flows, financial safeguards, and edge cases before public launch.

---

## 1. System Access & Test Credentials

| App | Live URL | Access / Role | Credentials |
| :--- | :--- | :--- | :--- |
| **Admin Kitchen Portal** | [https://eclypheon.github.io/nyopasta/admin/](https://eclypheon.github.io/nyopasta/admin/) | Staff / Kitchen Display | Username: `waiyan`<br>Password: `nyopasta2026*` |
| **Customer Web App** | [https://eclypheon.github.io/nyopasta/customer/](https://eclypheon.github.io/nyopasta/customer/) | Customer / Member | Google OAuth, Email/Password, or Continue as Guest |
| **PayNow Recipient** | Singapore Mobile: `+65 92258003` | Recipient: NYO PASTA | Dynamic EMVCo QR with locked SGD amount and reference code |

---

## 2. Preparation Checklist Before Testing

- [ ] Device A (Tablet / Laptop / Phone): Open the Admin Kitchen Portal in a browser.
- [ ] Device B (Mobile Phone): Open the Customer Web App in Safari or Chrome.
- [ ] Ensure both devices are connected to mobile data or Wi-Fi.
- [ ] Prepare a banking app on Device B (DBS/POSB, OCBC, UOB, or GrabPay) capable of scanning PayNow QR codes.

---

## 3. Core Operational Workflows

### Test Case 1: Staff Authentication & Session Persistence
*Objective: Ensure staff access is secured with the agreed credentials and does not drop unexpectedly.*

1. On **Device A**, navigate to the Admin App.
2. Enter username `waiyan` and password `nyopasta2026*`.
3. Click **Login (登录)**.
4. Verify the dashboard loads showing tabs: Orders (订单), Users (会员), Menu (菜单), Settings (设置).
5. Refresh the browser tab.
6. **Expected Result**: Staff remains logged in without being redirected to the login form. A Logout button is accessible in the header.

---

### Test Case 2: Physical Stamp Card Migration
*Objective: Migrate an existing customer from their physical cardboard stamp card to the digital system.*

1. On **Device B** (Customer), open the Customer App.
2. Sign in as a member (via Google OAuth or Email Sign-up).
3. Tap the **Profile / Loyalty** tab to view your personal Member QR Code and current stamp balance (starts at 0).
4. On **Device A** (Admin), switch to the **Users (会员)** tab.
5. Tap **Scan Customer QR (扫码录入会员)** and grant camera access (or look up by customer name/phone).
6. Point camera at Device B's QR code.
7. In the migration modal, input the number of stamps from the physical card (e.g. `1` stamp).
8. Tap **Confirm Migration (确认迁移)**.
9. **Expected Result**:
   - Device A displays a confirmation banner and lists the customer with 1 stamp.
   - Device B updates to reflect 1 filled stamp on the digital loyalty card.

---

### Test Case 3: Customer Order with Dynamic EMVCo PayNow QR
*Objective: Test end-to-end ordering, dynamic PayNow QR generation, kitchen ticket arrival, and payment reconciliation.*

1. On **Device B** (Customer), select 1 Main dish (e.g., Prawn Cream Pasta $10.50).
2. Choose **Dine-in** or **Takeaway** (verify $0.30 takeaway packaging fee applies if takeaway).
3. Open the Cart Drawer and select **PayNow QR** as the payment method.
4. Tap **Place Order (提交订单)**.
5. A dynamic EMVCo PayNow QR code modal appears on Device B:
   - Verify the merchant name displays **NYO PASTA**.
   - Verify the exact order amount is displayed.
   - Note the unique reference code (e.g., `NYO-001`).
6. Scan the QR code using your Singapore banking app (PayNow):
   - **Crucial Check**: Verify that your banking app automatically locks the exact dollar amount and populates the reference code without requiring manual typing.
7. Complete the transfer in your bank app, then tap **I have completed payment (我已完成付款)** on Device B.
8. On **Device A** (Admin), watch the **Orders (订单)** tab:
   - **Expected Result**: The new order ticket appears automatically on the kitchen board within 3.5 seconds (no manual page reload required).
   - The ticket displays the order number, customer name, items, fulfillment type, and a yellow **UNPAID (待核验)** badge.
9. Staff verifies their bank push notification or PayNow incoming alert matching the reference code, then taps **Mark Paid (标记已付款)** on the ticket.
10. The badge turns green: **PAID (已支付)**.

---

### Test Case 4: Kitchen Order Fulfillment Progression
*Objective: Test kitchen ticket status transitions from receipt to archiving.*

1. On **Device A** (Admin), locate the active order ticket from Test Case 3:
   - Initial status: **Received (已接单)**.
2. Tap **Start Preparing (开始制作)**:
   - Status changes to **Preparing (制作中)** with an amber indicator.
3. Tap **Mark Ready (制作完成)**:
   - Status changes to **Ready for Collection (待取餐)** with a blue indicator.
4. Customer picks up meal or staff serves it. Tap **Complete & Archive (完成并归档)**:
   - The ticket clears from the active kitchen board and moves into the **History / Archived (历史记录)** list.
5. On **Device B** (Customer), tap **Order History (订单记录)**:
   - Verify the order appears in the history list with the completed status.
   - Verify the customer's loyalty balance has incremented by +1 stamp (total 2 stamps).

---

## 4. Edge Cases & Resilience Safeguards

### Test Case 5: Customer Order Cancellation (Before Preparation)
*Objective: Allow customers to cancel an accidental order before kitchen starts cooking, alerting staff in real time.*

1. On **Device B** (Customer), place a new order (e.g., Spicy Tomato Pasta).
2. While the order is still in **Received (已接单)** status:
   - Tap **Cancel Order (取消订单)** on the order success screen or in **Order History**.
   - Confirm the cancellation prompt.
3. On **Device A** (Admin Kitchen):
   - **Expected Result**: Within 3.5 seconds, the order ticket turns **red** with a bold **CANCELLED (已取消)** banner.
   - Staff sees the cancellation immediately and does not prepare the food.
4. Staff taps **Acknowledge & Archive (确认并归档)**:
   - The ticket is cleanly moved off the active kitchen line into the archive.

---

### Test Case 6: Cancellation Blocked After Preparation Starts
*Objective: Prevent food waste by blocking customer cancellation once kitchen begins cooking.*

1. On **Device B** (Customer), place an order.
2. On **Device A** (Admin), tap **Start Preparing (开始制作)**.
3. On **Device B** (Customer), go to **Order History**:
   - **Expected Result**: The "Cancel Order" button is hidden. The status displays "Preparing 制作中". Customer cannot cancel once ingredients are in the wok/pan.

---

### Test Case 7: Inventory Sold Out Mid-Order
*Objective: Prevent customers from ordering items that just ran out of stock while their cart was open.*

1. On **Device B** (Customer), add a popular item (e.g., Bacon Carbonara) to your cart, but **do not tap Place Order yet**.
2. On **Device A** (Admin), switch to the **Menu (菜单)** tab.
3. Find Bacon Carbonara and toggle its switch to **Sold Out (售罄)**.
4. Return to **Device B** (Customer):
   - Within 3.5 seconds, the customer app receives the inventory update.
   - The item in the cart or menu reflects sold out status.
   - Attempting to check out blocks the submission and prompts the customer to remove or replace the sold out item.

---

### Test Case 8: Dynamic Payment Options Toggling
*Objective: Verify admin can turn PayNow or Stripe payment options on or off, instantly updating customer checkout.*

1. On **Device A** (Admin), switch to the **Settings (设置)** tab.
2. Under **Payment Methods (支付方式)**:
   - Notice **Pay at Counter (到店付款)** is checked and greyed out (always mandatory fallback).
   - Uncheck **PayNow QR (PayNow 二维码付款)**.
   - Tap **Save Settings (保存设置)**.
3. On **Device B** (Customer), open the Cart Drawer:
   - **Expected Result**: PayNow QR is immediately hidden from the payment options grid. If PayNow was previously selected, the cart automatically falls back to Pay at Counter.
4. Return to **Device A** (Admin), re-check **PayNow QR**, and save.
5. On **Device B** (Customer), verify PayNow QR immediately reappears as a selectable option.

---

### Test Case 9: Emergency Store Closure
*Objective: Verify staff can instantly close online ordering during sudden kitchen rushes or bad weather.*

1. On **Device A** (Admin), open **Settings (设置)**.
2. Under **Emergency Store Status**, toggle **Manually Close Store (临时打烊)** to ON.
3. Enter a reason: `Kitchen rush - reopening in 30 mins`.
4. Tap **Save Settings**.
5. On **Device B** (Customer), refresh or observe the banner:
   - **Expected Result**: The top banner shows "Store is currently closed: Kitchen rush - reopening in 30 mins".
   - The "Add to Cart" and checkout buttons are disabled.
6. Return to **Device A** (Admin), toggle **Manually Close Store** to OFF, and save.
7. On **Device B** (Customer), ordering capability immediately restores.

---

## 5. Live Testing Verification Sign-Off

| Test # | Description | Result (Pass / Fail) | Tested By | Date & Time | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Admin Authentication & Session Persistence | `[ ]` | | | |
| **TC-02** | Physical Card Stamp Migration via QR | `[ ]` | | | |
| **TC-03** | Dynamic PayNow QR with Locked SGD & Ref | `[ ]` | | | |
| **TC-04** | Kitchen Board Progression & Archival | `[ ]` | | | |
| **TC-05** | Customer Order Cancellation in Received State | `[ ]` | | | |
| **TC-06** | Cancellation Blocked During Preparation | `[ ]` | | | |
| **TC-07** | Live Sold-Out Mid-Order Safeguard | `[ ]` | | | |
| **TC-08** | Dynamic Payment Options Toggling | `[ ]` | | | |
| **TC-09** | Emergency Store Closure & Instant Restoration | `[ ]` | | | |
