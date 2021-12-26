function login(){
    var isValid = checkRequired('email', 'email') && checkRequired('password', 'mật khẩu');

    if(!isValid) return;

    var email = $('#email').val();
    var password = $('#password').val();
    
    var jsondata = {
        email: email,
        password: password
    }

    $.ajax({
        url: "/login",
        method: "POST",        
        data: JSON.stringify(jsondata),
        contentType: "application/json"
    }).done(data => {
        console.log("OK");
        window.location.href = "/dashboard"
    }).fail(errMsg => {
        console.log("err", errMsg);
        $('.err-msg').text(errMsg.responseJSON.msg)
    })
}

function checkRequired(id, label){
    var val = $(`#${id}`).val();
    if(!val){
        $('.err-msg').text(`Bạn chưa nhập ${label}`);
        $(`#${id}`).css('border-color', 'red');
        return false;
    } else {
        $(`#${id}`).css('border-color', '#86BAEC');
        return true;
    }
}