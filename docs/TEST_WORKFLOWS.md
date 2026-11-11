# NYO PASTA Live Workflow & Edge Case Testing Guide

This guide is designed for live in-person testing between the developer and the restaurant owner (Wai Yan) to verify all operational flows, financial safeguards, and edge cases before public launch.

---

## 1. System Access & Credentials

| App | Live URL | Access / Role | Credentials / Auth Methods |
| :--- | :--- | :--- | :--- |
| **Admin Kitchen Portal** | [https://eclypheon.github.io/nyopasta/admin/](https://eclypheon.github.io/nyopasta/admin/) | Staff / Kitchen Display | Username: `waiyan`<br>Password: `nyopasta2026*`<br>*(Manual entry required; no prefilled credentials)* |
| **Customer Web App** | [https://eclypheon.github.io/nyopasta/customer/](https://eclypheon.github.io/nyopasta/customer/) | Customer / Member | **Method 1**: Google OAuth 2.0 (1-click, instant)<br>**Method 2**: Email & Password sign-up<br>**Method 3**: Continue as Guest |
| **PayNow Recipient** | Singapore Mobile: `+65 92258003` | Recipient: NYO PASTA | Dynamic EMVCo QR with locked SGD amount and reference code |

---

## 2. Authentication Architecture & Email Verification FAQ

### Google OAuth Signups
- **Flow**: Customer taps **Continue with Google** -> Google consent prompt -> redirects back to customer portal as a verified member.
- **Verification**: Google accounts are pre-verified by Google itself. No email verification step is needed.

### Email / Password Signups
- **Queue Experience (Standard F&B Best Practice)**: Customer inputs Name, Email, Phone, and Password -> Account is created and logged in immediately so the customer can order on the spot without stepping out of the physical queue to open an inbox.
- **Email Verification Service**:
  - In Appwrite Cloud, emails are sent via Appwrite's built-in transactional mail server (`noreply@appwrite.io`).
  - **Custom Domain / Gmail SMTP**: If the client wants automated verification emails or order receipts sent directly from their own email (e.g. `waiyan@nyopasta.com` or a Gmail account), Appwrite Cloud supports custom SMTP in **Appwrite Console -> Settings -> SMTP**. Staff does not need to connect their personal Google account; they simply supply the SMTP credentials in the console.

---

## 3. Preparation Checklist Before Testing

- [ ] Device A (Tablet / Laptop / Phone): Open the Admin Kitchen Portal in a browser.
- [ ] Device B (Mobile Phone): Open the Customer Web App in Safari or Chrome.
- [ ] Ensure both devices are connected to mobile data or Wi-Fi.
- [ ] Prepare a banking app on Device B (DBS/POSB, OCBC, UOB, or GrabPay) capable of scanning PayNow QR codes.

---

## 4. Core Operational Workflows

### Test Case 1: Staff Authentication (Manual Entry)
*Objective: Ensure staff access is secured with zero pre-filled form values.*

1. On **Device A**, navigate to the Admin App.
2. Confirm the username and password fields start completely empty.
3. Type username `waiyan` and password `nyopasta2026*`.
4. Click **Sign In to Kitchen Admin**.
5. Verify the dashboard loads showing tabs: Orders (订单), Users (会员), Menu (菜单), Settings (设置).
6. Refresh the browser tab.
7. **Expected Result**: Staff remains logged in without being redirected to the login form. A Logout button is accessible in the header.

---

### Test Case 2: Member Signup (Google OAuth & Email Options)
*Objective: Verify frictionless customer onboarding.*

1. On **Device B** (Customer), open the Customer App.
2. If prompted by the welcome sheet:
   - **Test Option A (Google OAuth)**: Tap **Continue with Google**, authenticate, and verify profile name matches your Google account.
   - **Test Option B (Email/Password)**: Tap **Create an Account**, input test name, email, and password. Tap **Sign Up**.
3. Tap the **Profile / Loyalty** tab.
4. **Expected Result**: You are logged in as a registered member with a personal Member QR Code, 0 stamps, and 0 vouchers.

---

### Test Case 3: Physical Stamp Card Migration
*Objective: Migrate an existing customer from their physical cardboard stamp card to the digital system.*

1. On **Device B** (Customer), open the **Profile / Loyalty** tab and tap **Show QR**.
2. On **Device A** (Admin), switch to the **Users (会员)** tab.
3. Tap **Scan Customer QR (扫码录入会员)** and grant camera access (or look up by customer name/phone).
4. Point camera at Device B's QR code.
5. In the migration modal, input the number of stamps from the physical card (e.g. `1` stamp).
6. Tap **Confirm Migration (确认迁移)**.
7. **Expected Result**:
   - Device A displays a confirmation banner and lists the customer with 1 stamp.
   - Device B updates to reflect 1 filled stamp on the digital loyalty card.

---

### Test Case 4: Customer Order with Dynamic EMVCo PayNow QR
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

### Test Case 5: Kitchen Order Fulfillment Progression
*Objective: Test kitchen ticket status transitions from receipt to archiving.*

1. On **Device A** (Admin), locate the active order ticket:
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

## 5. Loyalty Stamps & Voucher Wallet Workflows

### Test Case 6: Sides-Only Order Stamp Exemption (0 Stamps Earned)
*Objective: Prove that non-main dishes (garlic bread, soups, drinks) do not earn loyalty stamps.*

1. On **Device B** (Customer), clear the cart.
2. Add only side dishes (e.g. 2x Garlic Bread, 1x Mushroom Soup). Verify 0 mains are in the cart.
3. Check out and submit the order.
4. On **Device B**, view your loyalty card.
5. **Expected Result**:
   - Order total shows payment and items.
   - Stamp count does **NOT** increment.
   - Stamp history logs: `Order NYO-XXX: purchased 0 mains` (or `Order NYO-XXX placed`).

---

### Test Case 7: Milestone Reached & Voucher Wallet Credit
*Objective: Verify that reaching 4, 8, and 12 stamps credits vouchers into the customer's wallet.*

1. Using simulated controls or ordering mains:
   - Credit customer up to 4 stamps -> Verify **Voucher Wallet** increments by +1 for **$3.50 Free Side**.
   - Credit customer up to 8 stamps -> Verify **Voucher Wallet** increments by +1 for **$4.50 Free Side**.
   - Credit customer up to 12 stamps -> Verify **Voucher Wallet** increments by +1 for **$8.50 Free Main**.
2. **Expected Result**: The Customer Loyalty screen displays active voucher counts in **My Voucher Wallet (我的券包)**. In Admin **Users** tab, staff also sees: `1x $3.50 Side, 1x $4.50 Side, 1x $8.50 Main`.

---

### Test Case 8: 12-Stamp Card Rollover (Overflow Retention)
*Objective: Ensure card rollover to 0 (or remainder) does NOT wipe earned vouchers from the wallet.*

1. With a customer at 11 stamps, place an order with **3 mains** (total 14 stamps).
2. Observe customer profile:
   - `completedCardsCount`: increments from 0 to 1.
   - `currentStampCount`: wraps around to 2 (14 - 12 = 2 stamps on the new card).
   - **Voucher Wallet**: All earned vouchers ($3.50, $4.50, $8.50) **remain active and available**!
3. **Expected Result**: Vouchers do not reset to zero when the visual 12-stamp card resets.

---

### Test Case 9: Voucher Redemption at Checkout
*Objective: Apply an earned voucher discount to an order and verify deduction from wallet.*

1. On **Device B** (Customer), add items to cart (e.g. 1 Pasta $10.50 + 1 Garlic Bread $3.50 = $14.00).
2. Open Cart Drawer.
3. Under **Virtual Loyalty Stamp Reward**, tap **Free Side Voucher (Max $3.50)**.
4. Verify subtotal discounts by -$3.50.
5. Place the order.
6. Check customer's **Voucher Wallet**:
   - The $3.50 voucher count decreases by 1.
   - The remaining vouchers ($4.50, $8.50) are untouched.

---

## 6. Financial Safeguards & Customer Blacklisting

### Test Case 10: Unpaid No-Show Order & Account Blacklisting
*Objective: Protect the merchant when a customer orders with "Pay at Counter", kitchen prepares the food, but customer never collects or pays.*

1. On **Device B** (Customer), place an order selecting **Pay at Counter**.
2. On **Device A** (Admin Kitchen):
   - Ticket arrives as **UNPAID (待付款)**.
   - Staff taps **Mark Preparing**, then **Mark Ready**.
3. Customer fails to show up.
4. On **Device A**, staff expands the order ticket and taps **No-Show (弃单拉黑)**.
5. A modal appears with a prefilled remark:
   - `"Cancelled $14.00 order #NYO-XXX after ready and did not collect/pay"`
   - Checkbox is checked: **Blacklist Member Account (拉黑会员账号)**.
6. Staff taps **Confirm No-Show & Archive**.
7. **Expected Result**:
   - Order ticket is removed from the active kitchen board and archived as uncollected.
   - On **Device B** (Customer), when customer tries to submit any new order, the app blocks checkout with an alert:
     `"Ordering suspended: Account flagged (Cancelled $14.00 order after ready and did not collect/pay). Please approach counter staff to reactivate."`
   - In Admin **Users (会员)** tab, the customer is highlighted in red with a **BLACKLISTED (已拉黑)** badge.

---

### Test Case 11: Customer Debt Settlement & Unblacklisting
*Objective: Allow staff to reactivate a blacklisted customer after they pay their outstanding bill at the counter.*

1. Customer approaches counter on **Device B** and settles their balance in cash.
2. On **Device A** (Admin), switch to the **Users (会员)** tab.
3. Locate the blacklisted member.
4. Tap **Remove Blacklist (解封)**.
5. On **Device B** (Customer), refresh or tap Profile:
   - **Expected Result**: Blacklist warning clears immediately. Customer can resume online ordering.

---

## 7. Edge Cases & Resilience Safeguards

### Test Case 12: Customer Order Cancellation (Before Cooking Starts)
*Objective: Allow customer cancellation only while order is in Received state, alerting kitchen in real time.*

1. On **Device B** (Customer), place a new order.
2. While order is in **Received (已接单)** status, tap **Cancel Order (取消订单)** on Device B.
3. On **Device A** (Admin Kitchen):
   - **Expected Result**: The order ticket turns red with a **CANCELLED (已取消)** banner within 3.5 seconds.
   - Staff taps **Acknowledge & Archive (确认并归档)** to remove it from the board.

---

### Test Case 13: Cancellation Blocked After Kitchen Starts Cooking
*Objective: Prevent food waste once preparation begins.*

1. Place an order on **Device B**.
2. On **Device A**, tap **Mark Preparing**.
3. On **Device B**, check **Order History**:
   - **Expected Result**: "Cancel Order" button disappears. Status shows "Preparing 制作中". Customer cannot cancel.

---

### Test Case 14: Mid-Order Inventory Sold Out
*Objective: Prevent orders for items that ran out while customer was building their cart.*

1. On **Device B**, add Bacon Carbonara to cart (do not submit yet).
2. On **Device A**, switch to **Menu** tab and toggle Bacon Carbonara to **Sold Out (售罄)**.
3. On **Device B**:
   - Within 3.5 seconds, background polling flags the item as sold out.
   - Attempting checkout blocks submission with: `"[Item] is currently sold out. Please remove it from your cart to proceed."`

---

### Test Case 15: Dynamic Payment Options Toggling
*Objective: Verify admin can enable or disable PayNow or Stripe with instant customer reflection.*

1. On **Device A**, open **Settings (设置)**.
2. Uncheck **PayNow QR** and tap **Save Settings**.
3. On **Device B**, open Cart Drawer:
   - **Expected Result**: PayNow option disappears immediately, defaulting to Pay at Counter.
4. On **Device A**, re-check PayNow and save.
5. On **Device B**, PayNow option immediately reappears.

---

### Test Case 16: Emergency Store Closure
*Objective: Instant pause of all online ordering during peak kitchen rushes.*

1. On **Device A**, toggle **Manually Close Store (临时打烊)** to ON with reason: `Kitchen rush - 30 min break`.
2. On **Device B**:
   - Top banner displays: `"Store is currently closed: Kitchen rush - 30 min break"`.
   - Checkout is locked.
3. Toggle OFF on **Device A**; ordering restores immediately.

---

## 8. Live Testing Verification Sign-Off Table

| Test # | Description | Result (Pass / Fail) | Tested By | Date & Time | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Staff Authentication (Empty fields, manual entry) | `[ ]` | | | |
| **TC-02** | Member Signup (Google OAuth & Email options) | `[ ]` | | | |
| **TC-03** | Physical Card Stamp Migration via QR | `[ ]` | | | |
| **TC-04** | Dynamic PayNow QR with Locked SGD & Ref | `[ ]` | | | |
| **TC-05** | Kitchen Fulfillment Progression & Archival | `[ ]` | | | |
| **TC-06** | Sides-Only Order Stamp Exemption (0 stamps) | `[ ]` | | | |
| **TC-07** | Milestone Reached & Voucher Wallet Credit | `[ ]` | | | |
| **TC-08** | 12-Stamp Card Rollover (Overflow Retention) | `[ ]` | | | |
| **TC-09** | Voucher Redemption at Checkout & Wallet Deduction | `[ ]` | | | |
| **TC-10** | Unpaid No-Show Order & Account Blacklisting | `[ ]` | | | |
| **TC-11** | Customer Debt Settlement & Unblacklisting | `[ ]` | | | |
| **TC-12** | Customer Order Cancellation in Received State | `[ ]` | | | |
| **TC-13** | Cancellation Blocked During Preparation | `[ ]` | | | |
| **TC-14** | Live Sold-Out Mid-Order Safeguard | `[ ]` | | | |
| **TC-15** | Dynamic Payment Options Toggling | `[ ]` | | | |
| **TC-16** | Emergency Store Closure & Instant Restoration | `[ ]` | | | |
