/**
 * @param {String} code - Error Code
 * @param {String} msg - Error Message
 * @param {Error} ex
 * @param {String} src - Source Code Path
 */
export default class SystemError extends Error {
    constructor({ code='', msg='', ex='', src='', caller='' }) {
        super(msg);
        this.name = 'CoolError';
        this.code = code;
        this.message = msg;
        this.exception = ex;
        this.srcPath = src;
        this.caller = caller;

        this.toString = function () {
            let result = '';
            if(this.code){
                result += `[${this.code}]`;
            }
            result += this.message;
            if (this.exception) {
                result += ':' + ((typeof this.exception === "string")? this.exception : JSON.stringify(this.exception));
            }
            return result;
        };

        this.stackTrace = function () {
            let result = 'Error Message:';
            if(this.code){
                result += `[${this.code}]`;
            }
            result += this.message;
            if (this.exception) {
                result += '\nException:' + this.exception;
            }
            if (this.srcPath){
                result += '\nSource Path:' + this.srcPath;
            }
            if (this.caller) {
                result += '\nCaller:' + this.caller;
            }
            return result;
        };

        this.getValue = function () {
            let msg = '';
            msg += this.message;
            if (this.exception) {
                msg += ':' + this.exception;
            }
            let result = {
                code: this.code,
                message: msg,
            };
            return result;
        };
    }
}

