// Подключение библиотек
const app = require('express')(); // наше приложение app работает на базе Express
const bodyParser = require("body-parser");
const axios = require('axios');
const nunjucks = require('nunjucks');

const url = 'https://api.exolve.ru/messaging/v1/SendSMS'; // Точка доступа Exolve API для отправки SMS
const exolveNumber = '79XXXXXXXXX'; // купленный номер
const apiKey = 'YOUR_API_KEY'; // API-ключ

// Входящие HTTP запросы обрабатываются библиотекой body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded( {extended: false} ))

// nunjucks рендерит файлы из папки "views"
nunjucks.configure('views', { express: app });

// Порт, на котором работает наше приложение
const port = 3001;

// Ответ на клиентский запрос к главной странице приложения
app.get('/', (req, res) => {
    res.render('index.html', { message: 'Введите номер телефона в формате "79XXXXXXXXX"' });
});

users = []; // массив для хранения пар номер телефона/одноразовый код

function generateCode(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function addUser (phoneNumber, code) {
    // создаем объект на основе полученного номера телефона и сгенерированного одноразового кода
    user = {
      phoneNumber: phoneNumber,
      code: code
    }
    // Проверяем, если ли в массиве users объект с указанным номером
    userIndex = users.findIndex(el => el.phoneNumber == phoneNumber);
    
    if (userIndex == -1) { // Если нет, добавляем созданный объект в массив
        users.push(user);
      } else { // Если есть, заменяем одноразовый код на новый
        users[userIndex].code = code;
      }
}

async function sendVerificationCode(phoneNumber, code) {

    var text = "Одноразовый код: " + code;
    // Пробуем отправить SMS
    try {
      await axios({
        method: 'post',
        url: url,
        headers: {'Authorization': 'Bearer ' + apiKey},
        data: {
            number: exolveNumber,
            destination: phoneNumber.toString(),
            text: text
        }
    })
    .then((response) => {
        result = response.data; // Записываем ответ от Exolve API в переменную 
      });
    } catch (error) {
      return error.response.data.error // Возвращаем текст ошибки, если SMS не было отправлено
    }
  
    return result // Возвращаем ответ от Exolve (message_id при успешной отправке SMS)
}

app.post('/verify', async (req, res) => {
    const phoneNumber = req.body.phoneNumber; // номер пользователя из тела запроса
    const code = generateCode(1000, 9999); // генерируем случайный четырехзначный код
    addUser (phoneNumber, code); // добавляем пару номер/код в массив users
    const result = await sendVerificationCode(phoneNumber, code); // отправляем SMS с одноразовым кодом
    if (result.message_id !== undefined) { // если функция отправки кода возвращает нам message_id, рендерим страницу ввода кода
      res.render('check.html', { phoneNumber: phoneNumber, message: 'Введите код подтверждения' }); // передаем номер телефона пользователя, которое будет в скрытом поле
    } else { // в случае ошибки, снова рендерим главную страницу с сообщением об ошибке отправки
      console.log(result.details);
      res.render('index.html', { message: 'Сообщение не может быть доставлено. Проверьте правильность введенного номера. Формат номера "79XXXXXXXXX"' });
    }
});

app.post('/check', (req, res) => {
    const phoneNumber = req.body.phoneNumber; // номер пользователя из тела запроса (скрытое поле)
    const code = req.body.code; // введенный пользователем код
    userIndex = users.findIndex(el => el.phoneNumber == phoneNumber); // ищем индекс объекта с номером телефона
    if (users[userIndex].code == code) { // если введенный код совпадает с кодом в объекте, рендерим страницу успешной аутентификации 
      res.render('success.html', { message: 'Вы успешно авторизованы!'});
    } else { // Если код не совпадает, рендерим страницу ввода кода с сообщением об ошибке
      res.render('check.html', { phoneNumber: phoneNumber, message: 'Неверный код подтверждения. Введите правильный код.' });
    };
});

// Приложение будет слушать запросы на указанном выше порте
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`)
});