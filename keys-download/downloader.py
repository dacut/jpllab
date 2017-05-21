from __future__ import absolute_import, print_function
from httplib import BAD_REQUEST, INTERNAL_SERVER_ERROR, OK
from os import environ, fsync, write
from os.path import join as path_join
from subprocess import PIPE, Popen
from sys import stderr
from tempfile import mkstemp
from flask import Flask, make_response, request

app = Flask(__name__)

@app.route("/", methods=["POST"])
def download_key():
    key_format = request.form.get("format", "PEM")
    key = request.form.get("key")
    filename = request.form.get("filename")

    if filename is None:
        if key_format == "PPK":
            filename = "labkey.ppk"
        else:
            filename = "labkey.pem"

    error_headers = {
        "Content-Type": "text/plain; charset=utf-8",
    }

    if not key:
        return make_response(("No key specified", BAD_REQUEST, error_headers))

    if key_format == "PPK":
        temp_pem, temp_pem_filename = mkstemp(
            suffix=".pem", prefix="privkey", text=True)
        write(temp_pem, key)
        fsync(temp_pem)

        puttygen = path_join(environ["LAMBDA_TASK_ROOT"], "puttygen")
        proc = Popen([puttygen, temp_pem_filename, "-o", "/dev/stdout"],
                     stdin=PIPE, stdout=PIPE, stderr=PIPE)
        key, err = proc.communicate()

        if proc.returncode != 0:
            print("Failed to convert PEM to PPK: %s" % err, file=stderr)
            return make_response(
                ("Failed to convert PEM to PPK", INTERNAL_SERVER_ERROR,
                 error_headers))

    headers = {
        "Content-Disposition": "attachment; filename=\"%s\"" % filename,
        "Content-Type": "application/octet-stream",
    }

    return make_response((key, OK, headers))
