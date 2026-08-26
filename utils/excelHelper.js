const ExcelJS=require('exceljs');

async function verifyExcel(file){

    const workbook=new ExcelJS.Workbook();

    await workbook.xlsx.readFile(file);

    console.log("--------------------------------");

    console.log(file);

    console.log("Sheets :",workbook.worksheets.length);

    workbook.worksheets.forEach(sheet=>{

        console.log(
            sheet.name,
            sheet.rowCount
        );

    });

}

module.exports={verifyExcel};