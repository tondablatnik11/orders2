import { supabaseClient } from "./supabaseClient";

// Funkce pro logování změn statusu při importu
export const logStatusChanges = async (currentData, sourceImportId) => {
  try {
    // Načíst poslední známé statusy z DB (poslední záznam pro každou delivery)
    const { data: lastLogs, error: fetchError } = await supabaseClient
      .from('delivery_status_log')
      .select('delivery, status')
      .in('delivery', currentData.map(row => row["Delivery"]))
      .order('timestamp', { ascending: false });

    if (fetchError) {
      console.error("Error fetching previous statuses:", fetchError);
      return;
    }

    const lastStatusMap = {};
    lastLogs.forEach(log => {
      if (!lastStatusMap[log.delivery]) {
        lastStatusMap[log.delivery] = log.status;
      }
    });

    const newLogs = [];
    const now = new Date().toISOString();

    currentData.forEach(row => {
      const delivery = row["Delivery"];
      const currentStatus = Number(row["Status"]);

      if (!delivery || isNaN(currentStatus)) return;

      const lastStatus = lastStatusMap[delivery];

      // Pokud status není zaznamenán nebo se změnil → logovat
      if (lastStatus !== currentStatus) {
        newLogs.push({
          delivery: delivery,
          status: currentStatus,
          timestamp: now,
          source_import: sourceImportId,
          created_at: now,
        });
      }
    });

    if (newLogs.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('delivery_status_log')
        .insert(newLogs);

      if (insertError) {
        console.error("Error inserting status logs:", insertError);
      } else {
        console.log(`Inserted ${newLogs.length} status change logs.`);
      }
    }
  } catch (e) {
    console.error("Caught error in logStatusChanges:", e);
  }
};
