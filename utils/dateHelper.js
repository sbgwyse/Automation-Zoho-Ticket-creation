function formatDate(date){

    return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;

}

async function randomDateRange(page){

    const start=new Date(2025,0,1);

    const end=new Date();

    const from=new Date(
        start.getTime()+Math.random()*(end-start)
    );

    const to=new Date(
        from.getTime()+Math.random()*(end-from)
    );

    const range=`${formatDate(from)} - ${formatDate(to)}`;

    await page
        .getByRole('textbox',{name:'Select Date Range'})
        .fill(range);

    console.log(range);

}

module.exports={randomDateRange};