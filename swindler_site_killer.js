const puppeteer = require('puppeteer');
const reqText = "site:http://service-rem-pk.ru";
const users = [
    "Иван",
    "Петр",
    "Анна",
    "Елизавета",
    "Катя",
    "Лиза",
    "Григорий",
    "Богдан",
    "Влад",
    "Владимир",
    "Вика",
    "Настя",
    "Вероника",
    "Валя",
    "Вадим",
    "Сергей",
    "Галя",
    "Диана",
    "Ксюша",
    "Зоя",
    "Гульнара",
    "Камила",
    "Лера",
    "Надежда",
    "Раиса",
    "Роза",
    "Рената",
    "Элла"
];

let prefixNum = [
    "952",
    "921",
    "933",
    "950",
    "911",
    "999",
    "981",
    "987",
    "927",
    "936",
    "930",
    "924",
    "914",
    "903",
    "365",
    "916",
    "915",
    "910",
    "903"
];
const timerTime = 30000; //частота цикла

let startKill = async () => {
    const browser = await puppeteer.launch({headless: true});
    let page = await browser.newPage();
    page.waitForNavigation(3000);
    //Ищем все ссылки
    let search = new Search();
    search.setPage(page);
    search.setSearchText(reqText);
    let links = await search.getSearchLinks();
    //let links = ["http://nn.virusremoval.service-rem-pk.ru/"];
    //обрабатываем каждую ссылку, переходим на нее и заполняем все формы, какие есть на сайте
    for (let link of links) {
        let siteInst = new Site();
        siteInst.setBrowser(browser);
        siteInst.setUsers(users);
        siteInst.setPrefixNum(prefixNum);
        siteInst.setPath(link);
        await siteInst.resolveAndStartSendForm();
    }

    browser.close();
    setTimeout(()=>{
        startKill();
    }, timerTime)

};

startKill();

//Поиск
var Search = function (){
    this.path = "https://yandex.ru/search/?text=";
};

Search.prototype.setPage = function(page) {
    this.page = page;
}

Search.prototype.setSearchPath = function(text) {
    this.searchPath = this.path+text;
}

Search.prototype.setSearchText = function(text) {
    this.searchText = text;
    this.setSearchPath(text);
}

Search.prototype.getSearchLinks = async function() {
    let links = [];
    await this.page.goto((this.searchPath));
    await this.page.waitFor(1000);
    let pageCounts = await this.getPagesResult();//смотрим сколько еще страниц у нас на поиске

    for(var i = 0; i < pageCounts; i++){
        let numPage = i;
        //первую страницу не запрашиваем, у нас уже есть результат поиска по ней
        if(numPage > 0) {
            let pathWithPageNum = this.searchPath + "&p=" + numPage;
            await this.page.goto((pathWithPageNum));
            await this.page.waitFor(1000);
        }
        let linksFromPage = await this.getListLinksFromSearchPage();
        links = links.concat(linksFromPage);
    }
    return links;
}

Search.prototype.getListLinksFromSearchPage = async function() {
    let links = [];
    await this.page.$eval('.serp-list', function(elementResp) {
        let elms =elementResp.getElementsByClassName("link_outer_yes") ;
        let data = [];
        for (var element of elms){
            let link = "http://"+element.innerText;
            data.push(link);
        }
        return data;
    }).then(function(result) {
        links = links.concat(result);
    });
    return links;
}

Search.prototype.getPagesResult = async function() {
    let pageCounts = 0;
    await this.page.$eval('.pager',(page) => {
        let elms =page.querySelectorAll("a");
        let countPages = 0;
        for (var element of elms){
            countPages++;
        }
        return countPages;
    }).then(function(countPages) {
            pageCounts = countPages;
    });
    return pageCounts;
}

//Работа с сайтом
var Site = function(){}

Site.prototype.setBrowser = function(browser) {
    this.browser = browser;
}

Site.prototype.setPath = function(path) {
    this.path = path;
}

Site.prototype.resolveAndStartSendForm = function(){
    return new Promise(resolve => {
        setTimeout(() => {
            this.startSendForms();
            resolve(true);
        }, 4000);
    });
}

Site.prototype.startSendForms = async function() {
    this.page = await this.browser.newPage();
    await this.page.goto((this.path));
    await this.page.waitFor(1000);
    this.findAndSendForms();
}

Site.prototype.findAndSendForms = async function(){

    await this.page.evaluate(async () => {
        await window.scrollTo(0, document.body.scrollHeight);
    });

    const bodyHandle = await this.page.$('body');
    let phone = this.getRandomPhoneNumber();
    let name = this.getRandomUserName();
    const html = await this.page.evaluate((body, phone, name) => {
        let forms = body.querySelectorAll('form');
        for(let form of forms){
            let fields = form.querySelectorAll('.field');
            for(let field of fields){
               let fieldInput = field.querySelector('input');
               let typeField = field.getAttribute("data-type");
               let value;
               switch (typeField){
                   case "phone":
                       value = phone;
                       break;
                   default:
                       value = name;
                       break;
               }
               fieldInput.focus();
               fieldInput.value = value;
            }

            setTimeout(()=> {
                form.querySelector("button.submit").click();
            }, 300)

        }

    }, bodyHandle, phone, name);

    setTimeout(()=> {
        this.sendCallBakcForm();
    }, 2000);
}

Site.prototype.sendCallBakcForm = async function(formNum){
    const bodyHandle = await this.page.$('body');
    let phoneNumber = this.getRandomPhoneNumber();
    const html = await this.page.evaluate((body, phoneNumber) => {
        let buttonCallBack = body.querySelector('.expecto-callback-btn__overlay');
        if(buttonCallBack){
            buttonCallBack.click();
            body.querySelector(".expecto-input__input").value= phoneNumber;
            setTimeout(()=>{
                body.querySelector(".expecto-button__btn").click()
            }, 1000)
        }
    }, bodyHandle, phoneNumber);
}

Site.prototype.getRandomPhoneNumber = function(){
    let phoneNum = "8";
    let randPrefixNum = this.getRandomNumFromArr(this.prefixNums);
    phoneNum += this.prefixNums[randPrefixNum];
    phoneNum += Math.floor(1000000 + Math.random() * 9000000);
    return phoneNum;
}

Site.prototype.getRandomUserName = function(){
    var rand = this.getRandomNumFromArr(this.users);
    return  this.users[rand];
}

Site.prototype.getRandomNumFromArr = function(arr) {
    return (arr) ? Math.floor(Math.random() * arr.length) : 0;
}

Site.prototype.setUsers = function(users){
    this.users = users;
}

Site.prototype.setPrefixNum= function(prefixNums){
    this.prefixNums = prefixNums;
}
