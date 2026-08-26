async function login(page){

    await page.goto("http://192.168.0.23:4220/etam_prime_taj/login");

    await page.getByPlaceholder('Username')
        .fill('ADMIN/etam100');

    await page.getByPlaceholder('Password')
        .fill('$WysE123');

    await page.getByRole('button',{
        name:/sign in/i
    }).click();

    await page.waitForLoadState('networkidle');

}

module.exports={login};