async function selectRandomDropdown(dropdown){

    await dropdown.waitFor();

    const count=await dropdown.locator('option').count();

    if(count<=1) return;

    const random=Math.floor(Math.random()*(count-1))+1;

    await dropdown.selectOption({index:random});

    return random;
}

module.exports={selectRandomDropdown};