# Inventra — your school store book, on a computer

Keep track of what is in your store, what students collect, and what needs restocking. Inventra works without internet. Your records save on this computer when you click **Save** or **Record collection**.

## Watch a quick demo

[Watch the storekeeper demo](Inventra/docs/inventra-demo.webm) (with on-screen instructions; no sound).

## 1. Set up your store

Open Inventra. Click **Settings** at the bottom left. Enter your school name and your name, choose your currency, then click **Save details**.

You do not need to create an account. A new store starts empty.

## 2. Add the things you sell or give out

Click **Materials → Add material**.

- **Material name:** for example, Exercise book.
- **Category / Size:** optional details, such as Stationery / 80 leaves.
- **Unit price:** the price of ONE item. Enter `500`, without a currency symbol.
- **Current stock:** how many you have now. For example, `20` books.
- **Low-stock level:** when you want a reminder. Enter `5` to get a reminder when 5 or fewer remain.

Click **Save**. Repeat for your other items. Add different sizes as separate materials so you can count each size correctly.

## 3. Register a student

Click **Students → Add student**. Enter the student's full name, admission number and class. Choose their house colour: Green, Red, Yellow or Blue. Add a remark if needed, then click **Save**.

Use one record per admission number. Search for an existing student before adding them again.

## 4. Give materials to a student

1. Click **New collection** on Overview or Collections.
2. Find and select the student. Check the name and house colour.
3. Choose a material and enter how many they are collecting.
4. Click **Add to collection**. Repeat for any other materials.
5. Check the student, items, quantities and total, then click **Record collection**.

Inventra saves the record and subtracts the items from your stock. If you had 20 books and issued 2, you now have 18. Adding items to the list alone does not save the collection.

**A collection means materials handed out.** The amount shows their value. Inventra does not track whether a student has paid or owes money.

## 5. When new stock arrives

Go to **Materials** and click the pencil beside the item. Change **Current stock** to the new total, then click **Save**.

**Example:** 18 books left + 30 new books = enter **48**.

## 6. Check records and fix mistakes

- **Who collected what?** Open **Collections** and click a student's name or the arrow beside the record. You can also open a student in **Students** to see their history.
- **Wrong collection?** Open it, click **Void collection**, then confirm. Its items return to stock and the old record stays marked Voided. Record the correct collection afterwards. Check the physical items match the corrected record.
- **Wrong name, price or stock count?** Use the pencil in **Students** or **Materials**. Changing a price does not change old collection amounts.
- **Student has left or item is discontinued?** Use the archive icon beside the record. History stays saved. Choose **Archived** in the list filter to find it and click **Restore** if needed.

## 7. Before you close for the day

Check **Reminders** for items running low. Use **Sticky notes → Add note** for tasks such as “Order more exercise books”. Tick a note when the task is done.

Then go to **Settings → Export backup** and save the file to a USB drive or another safe place. Your work stays saved when you close Inventra, but a separate backup protects you if the computer fails.

To recover saved records, choose **Settings → Restore backup**, select an Inventra backup file, and confirm. **Restoring replaces all current records with the backup.** Export your current records first if you need to keep them.

## Need help?

- **Cannot find a record?** Clear the search box and check the list filter, including Archived.
- **Cannot issue an item?** Check that it has enough stock and that both the student and material are active.
- **Changed currency?** This only changes the currency label; it does not convert prices.
- **Using another computer?** Export a backup from the old computer and restore it on the new one. Records do not sync automatically.

## For the person installing Inventra

Storekeepers with Inventra installed can open it like any other desktop app. To run this source code, see the [setup and developer guide](Inventra/docs/DEVELOPMENT.md).
