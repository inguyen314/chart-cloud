<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

ini_set("xdebug.var_display_max_children", '-1');
ini_set("xdebug.var_display_max_data", '-1');
ini_set("xdebug.var_display_max_depth", '-1');

date_default_timezone_set('America/Chicago');
if (date_default_timezone_get()) {
}
if (ini_get('date.timezone')) {
}

// Set the content type to JSON
header('Content-Type: application/json');

try {
    // Log that the file has been called
    error_log("chart.php has been called!");

    // Read the raw POST data
    $input = file_get_contents('php://input');
    error_log("Incoming data: " . $input); // Log the incoming payload

    // Decode the incoming JSON data
    $data = json_decode($input, true);

    var_dump($data);

    // Check for JSON decoding errors
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("JSON decoding error: " . json_last_error_msg());
        echo json_encode([
            "status" => "error",
            "message" => "Invalid JSON payload: " . json_last_error_msg()
        ]);
        exit; // Stop further execution
    }

    // Validate the incoming data structure
    if (!isset($data['values']) || !is_array($data['values'])) {
        error_log("Invalid or missing 'values' array in payload");
        echo json_encode([
            "status" => "error",
            "message" => "Invalid or missing 'values' array in payload"
        ]);
        exit; // Stop further execution
    }

    // Call the function to save data to Oracle
    $response = saveDataToOracle($data);

    // Send a success response back to the client
    echo json_encode($response);
} catch (Exception $e) {
    // Log the error message
    error_log("Exception caught in chart.php: " . $e->getMessage());

    // Send an error response back to the client
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}

/**
 * Function to save data to Oracle.
 *
 * @param array $data The decoded JSON data.
 * @return array The response message indicating success or failure.
 */
function saveDataToOracle($data)
{
    // Database connection details
    $host = 'coe-mvsuwd04mvs.mvs.usace.army.mil';
    $port = '1521';
    $serviceName = 'B3CWMSP1';
    $dbUser = 'wm_mvs_datman';
    $dbPassword = 'Oct_Oct_Oct_632';

    // Construct the Oracle connection string
    $dbConnection = "(DESCRIPTION =
        (ADDRESS = (PROTOCOL = TCP)(HOST = $host)(PORT = $port))
        (CONNECT_DATA = (SERVICE_NAME = $serviceName))
    )";

    try {
        // Connect to the Oracle database
        $conn = oci_connect($dbUser, $dbPassword, $dbConnection);
        if (!$conn) {
            $e = oci_error();
            throw new Exception('Failed to connect to Oracle: ' . $e['message']);
        }
    
        // SQL to check for an existing row
        $checkSql = "SELECT COUNT(*) AS count 
                     FROM wm_mvs_datman.DATMAN_POR_BACKUP 
                     WHERE TS_CODE = :ts_code 
                       AND TO_CHAR(DATE_TIME, 'DD-MON-YY') = :date_time";
        $checkStmt = oci_parse($conn, $checkSql);
    
        // SQL to insert a new row
        $insertSql = "INSERT INTO wm_mvs_datman.DATMAN_POR_BACKUP (
                          TS_CODE,
                          DATA_ENTRY_DATE,
                          DATE_TIME,
                          VALUE,
                          QUALITY,
                          TS_PARTITION,
                          DMQ_CODE
                      ) VALUES (
                          :ts_code,
                          TO_DATE(:data_entry_date, 'DD-MON-YY'),
                          TO_DATE(:date_time, 'DD-MON-YY'),
                          :value,
                          :quality,
                          :ts_partition,
                          :dmq_code
                      )";
        $insertStmt = oci_parse($conn, $insertSql);
    
        // Iterate over the input data
        foreach ($data['values'] as $row) {
            $tsCode = $row[0];
            $dataEntryDate = $row[1];
            $dateTime = $row[2];
            $value = $row[3];
            $quality = $row[4];
            $tsPartition = $row[5];
            $dmqCode = $row[6];
    
            // Check if the row already exists
            oci_bind_by_name($checkStmt, ':ts_code', $tsCode);
            oci_bind_by_name($checkStmt, ':date_time', $dateTime);
            oci_execute($checkStmt);
    
            $row = oci_fetch_assoc($checkStmt);
            $existingCount = $row['COUNT'];
            error_log("Checking TS_CODE=$tsCode, DATE_TIME=$dateTime - Found $existingCount existing rows");
    
            if ($existingCount > 0) {
                // Skip inserting this row
                error_log("Duplicate row found. Skipping: TS_CODE=$tsCode, DATE_TIME=$dateTime");
                continue;
            }
    
            // Bind parameters for the insert statement
            oci_bind_by_name($insertStmt, ':ts_code', $tsCode);
            oci_bind_by_name($insertStmt, ':data_entry_date', $dataEntryDate);
            oci_bind_by_name($insertStmt, ':date_time', $dateTime);
            oci_bind_by_name($insertStmt, ':value', $value);
            oci_bind_by_name($insertStmt, ':quality', $quality);
            oci_bind_by_name($insertStmt, ':ts_partition', $tsPartition);
            oci_bind_by_name($insertStmt, ':dmq_code', $dmqCode);
    
            // Insert the new row
            $result = oci_execute($insertStmt, OCI_NO_AUTO_COMMIT);
            if (!$result) {
                $e = oci_error($insertStmt);
                throw new Exception("Error inserting row: " . $e['message']);
            }
        }
    
        // Commit the transaction
        oci_commit($conn);
    
        // Free resources
        oci_free_statement($checkStmt);
        oci_free_statement($insertStmt);
        oci_close($conn);
    
        return ["status" => "success", "message" => "Data saved successfully"];
    } catch (Exception $e) {
        // Roll back on error
        if (isset($conn) && $conn) {
            oci_rollback($conn);
            oci_close($conn);
        }
        error_log("Error in saveDataToOracle: " . $e->getMessage());
        return ["status" => "error", "message" => $e->getMessage()];
    }     
}