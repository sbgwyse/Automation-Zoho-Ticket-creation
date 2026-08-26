const executionReport = [];

function addStep(
    testName,
    mainSection,
    subSection,
    status,
    error = "",
    lineNo = ""
) {
    const now = new Date();

    executionReport.push({
        srNo: executionReport.length + 1,
        testName,
        mainSection,
        subSection,
        status,
        error,
        lineNo,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
    });
}

function getReport() {
    return executionReport;
}

module.exports = {
    addStep,
    getReport
};