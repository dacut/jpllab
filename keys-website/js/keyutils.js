function decrypt() {
    var userId = $("#userid").val();
    var password = $("#password").val();
    var userdata = keydata[userId];
    var result;

    console.log("decrypting");

    if (userdata) {
        try {
            result = sjcl.decrypt(password, userdata);
            result = JSON.parse(result);

            $("#sshkey").val(result.sshKey);
            $("#accesskey").val(result.accessKey);
            $("#secretkey").val(result.secretKey);

            $("#invalid-msg").addClass("hidden");
            return;
        }
        catch (e) {
            // Invalid password; just fall through.
        }
    }

    $("#sshkey").val("");
    $("#accesskey").val("");
    $("#secretkey").val("");

    $("#invalid-msg").removeClass("hidden");

    return;
}

$("input").keypress(function(event) {
    if (event.which == 13) {
        event.preventDefault();
        decrypt();
    }
});
