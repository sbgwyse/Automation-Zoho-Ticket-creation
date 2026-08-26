const path=require('path');

async function downloadAndVerify(page,locator){

    try{

        await locator.waitFor({
            state:'visible',
            timeout:5000
        });

        const downloadPromise=page.waitForEvent('download',{
            timeout:10000
        });

        await locator.click();

        const download=await downloadPromise;

        const filePath=path.join(
            "Downloads",
            download.suggestedFilename()
        );

        await download.saveAs(filePath);

        console.log("Downloaded :",filePath);

        return filePath;

    }
    catch{

        console.log("Download not available");

        return null;

    }

}

module.exports={downloadAndVerify};