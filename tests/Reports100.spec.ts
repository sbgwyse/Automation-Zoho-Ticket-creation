const {test}=require('@playwright/test');

const {login}=require('../utils/login');

const {downloadAndVerify}=require('../utils/downloadHelper');

const {randomDateRange}=require('../utils/dateHelper');

const {selectRandomDropdown}=require('../utils/dropdownHelper');

const {verifyExcel}=require('../utils/excelHelper');

let downloadedFiles=[];

test('Reports Testing',async({page})=>{

    await login(page);

    await test.step("Open Reports",async()=>{

        await page.getByText('REPORTS').click();

    });

    await test.step("Master Reports",async()=>{

        await page
            .getByRole('combobox')
            .selectOption('Master Reports');

        const reports=
            page.getByText('Download Report');

        const total=
            await reports.count();

        console.log("Total Reports :",total);

        for(let i=0;i<total;i++){

            console.log(`Downloading Report ${i+1}`);

            const file=
                await downloadAndVerify(
                    page,
                    reports.nth(i)
                );

            if(file){

                downloadedFiles.push(file);

            }

            await page.waitForTimeout(2000);

        }

    });

    await test.step("Attendance Reports",async()=>{

        await page
            .getByRole('combobox')
            .selectOption('Attendance Reports');

        const reportDropdown=
            page.locator(
                'select[name="selectedReports"]'
            );

        await selectRandomDropdown(reportDropdown);

        await randomDateRange(page);

        await page.waitForTimeout(2000);

        await page.getByRole('button',{
            name:'Show'
        }).click();

        await page.waitForTimeout(4000);

        const downloadButton=
            page.getByRole('button',{
                name:/Download/i
            });

        if(await downloadButton.isVisible()){

            const file=
                await downloadAndVerify(
                    page,
                    downloadButton
                );

            if(file){

                downloadedFiles.push(file);

            }

        }

    });

    await test.step("Verify Random Excel",async()=>{

        if(downloadedFiles.length==0){

            console.log("No Excel files downloaded.");

            return;

        }

        const randomFiles=
            downloadedFiles
            .sort(()=>0.5-Math.random())
            .slice(0,2);

        for(const file of randomFiles){

            await verifyExcel(file);

        }

    });

});