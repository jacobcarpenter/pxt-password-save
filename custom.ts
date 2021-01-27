const hashLength = 8; // bits

//% block="Password Save"
//% groups=['Create', 'Data', 'Password']
namespace pwsave {
    //% group="Create" weight=100
    //% block="create password data"
    //% blockSetVariable=saveFormat
    export function create() {
        return new PasswordData();
    }

    //% group="Password" weight=60
    //% block="splash $format password"
    //% format.shadow="variables_get" format.defl="saveFormat"
    export function splashPassword(format: PasswordData) {
        game.splash("Password", format.getPassword());
    }

    //% group="Password"
    //% block="prompt for $format password"
    //% format.shadow="variables_get" format.defl="saveFormat"
    export function promptForPassword(format: PasswordData) {
        const expectedLength = format.expectedPasswordLength;
        while (true) {
            const pw = game.askForString("Enter code", expectedLength);
            if (format.loadFrom(pw)) {
                // success
                return true;
            }

            // try again?
            if (!game.ask("Could not load from pw", "Try again?")) {
                return false;
            }
        }
    }

    export class PasswordData {
        constructor() {
        }

        get expectedPasswordLength() {
            // TODO: more direct calculation of expected length
            return this.getPassword().length;
        }

        //% group="Create" weight=60
        //% block="register $this(saveFormat) small number $field"
        //% field.shadow="pwsave_numbervaluekind"
        registerSmallNumber(field: number) {
            if (hasField(this._fields, field)) {
                return;
            }

            this._fields.push(field);
        }

        //% group="Create"
        //% block="register $this(saveFormat) flag $field"
        //% field.shadow="pwsave_flagkind"
        registerFlag(field: number) {
            if (hasField(this._flags, field)) {
                return;
            }

            this._flags.push(field);
        }

        //% group="Data" weight=100
        //% block="set $this(saveFormat) small number $field $value"
        //% field.shadow="pwsave_numbervaluekind"
        setSmallNumber(field: number, value: number) {
            if (!hasField(this._fields, field)) {
                throw 'Field not registered with this object. You must register all fields before saving/loading.';
            }

            if (value < 0 || value > 255 || Math.trunc(value) !== value) {
                throw 'Small numbers must be integers in the range of 0-255 (inclusive).'
            }

            this._fieldValues[field] = value;
        }

        //% group="Data" weight=80
        //% block="set $this(saveFormat) flag $field $value"
        //% field.shadow="pwsave_flagkind"
        setFlag(field: number, value: boolean) {
            if (!hasField(this._flags, field)) {
                throw 'Field not registered with this object. You must register all fields before saving/loading.';
            }

            this._flagValues[field] = value;
        }

        //% group="Data" weight=90
        //% block="get $this(saveFormat) small number $field"
        //% field.shadow="pwsave_numbervaluekind"
        getSmallNumber(field: number) {
            if (!hasField(this._fields, field)) {
                throw 'Field not registered with this object. You must register all fields before saving/loading.';
            }

            return this._fieldValues[field] || 0;
        }

        //% group="Data" weight=70
        //% block="get $this(saveFormat) flag $field"
        //% field.shadow="pwsave_flagkind"
        getFlag(field: number) {
            if (!hasField(this._flags, field)) {
                throw 'Field not registered with this object. You must register all fields before saving/loading.';
            }

            return !!this._flagValues[field];
        }

        //% group="Password" weight=60
        //% advanced=true
        //% block="get password for $this(saveFormat)"
        getPassword() {
            // TODO: random rotate?
            // combine fields and flags into one buffer to compute checksum
            const saveData = helpers.bufferConcat(
                makeFieldsBuffer(this._fields, this._fieldValues),
                makeFlagsBuffer(this._flags, this._flagValues)
            );
            const checksum = saveData.hash(hashLength);

            const password = Buffer.create(1 + saveData.length);
            password.setUint8(0, checksum);
            password.write(1, saveData);

            return toBase32(password);
        }

        //% group="Password"
        //% advanced=true
        //% block="load $this(saveFormat) from $password"
        loadFrom(password: string) {
            // check length
            if (password.length !== this.expectedPasswordLength) {
                return false;
            }

            const dataWithChecksum = fromBase32(password);
            if (!dataWithChecksum) {
                return false;
            }

            const saveData = dataWithChecksum.slice(1);
            if (dataWithChecksum.getUint8(0) !== saveData.hash(hashLength)) {
                return false;
            }

            const fieldsData = saveData.slice(0, this._fields.length);
            const flagsData = saveData.slice(this._fields.length);

            this._fieldValues = this._fields.reduce(
                (acc: { [field: string]: number }, field, index) => {
                    acc[field] = fieldsData.getUint8(index);
                    return acc;
                }, {});

            // TODO: validate there isn't any data in padding space?
            this._flagValues = this._flags.reduce(
                (acc: { [field: string]: boolean }, field, index) => {
                    const bitOffset = 7 - (index % 8);
                    acc[field] = (flagsData.getUint8(Math.trunc(index / 8)) & (1 << bitOffset)) !== 0;
                    return acc;
                }, {});

            return true;
        }

        //% group="Data" weight=10
        //% block="clear all $this(saveFormat) data"
        clearAllData() {
            this._fieldValues = {};
            this._flagValues = {};
        }

        _fields: number[] = [];
        _fieldValues: { [field: string]: number } = {};

        _flags: number[] = [];
        _flagValues: { [field: string]: boolean } = {};
    }
}

namespace NumberValueKind {
    //% shim=KIND_GET
    //% blockId=pwsave_numbervaluekind
    //% block="$field"
    //% kindMemberName=field
    //% kindNamespace=NumberValueKind
    //% kindPromptHint="e.g. RemainingSpecials, Coins, etc."
    //% blockHidden=true
    export function _numberValueKind(field: number): number {
        return field;
    }

    let nextKind: number;
    export function create() {
        if (nextKind === undefined) nextKind = 1000;
        return nextKind++;
    }

    //% isKind
    export const Level = create();
}

namespace FlagValueKind {
    //% shim=KIND_GET
    //% blockId=pwsave_flagkind
    //% block="$field"
    //% kindMemberName=field
    //% kindNamespace=FlagValueKind
    //% kindPromptHint="e.g. FoundEnergyTank1, etc."
    //% blockHidden=true
    export function _flagKind(field: number): number {
        return field;
    }

    let nextKind: number;
    export function create() {
        if (nextKind === undefined) nextKind = 1000;
        return nextKind++;
    }

    //% isKind
    export const FoundEnergyTank1 = create();
}

function hasField(fields: number[], field: number) {
    // no Array.prototype.includes, apparently
    return fields.some(x => x === field);
}

function makeFieldsBuffer(fields: number[], fieldValues: { [field: string]: number }) {
    return fields.reduce((buffer, field, index) => {
        buffer.setUint8(index, fieldValues[field] || 0);
        return buffer;
    }, Buffer.create(fields.length));
}

function makeFlagsBuffer(flags: number[], flagValues: { [field: string]: boolean }) {
    const flagsData = flags.reduce((acc, field, index) => {
        if (index % 8 === 0) {
            acc.push(0);
        }

        const bitOffset = 7 - (index % 8);
        const value = flagValues[field] ? 1 : 0;

        acc[acc.length - 1] |= value << bitOffset;
        return acc;
    }, []);

    return flagsData.reduce((buffer, packedValue, index) => {
        buffer.setUint8(index, packedValue);
        return buffer;
    }, Buffer.create(flagsData.length));
}

function toBase32(src: Buffer) {
    let result = [];
    let unread = 0;
    let runningBits = 0;

    for (let i = 0; i < src.length; i++) {
        runningBits = (runningBits << 8) | src.getUint8(i);
        unread += 8;

        while (unread >= 5) {
            const value = (runningBits >> (unread - 5)) & 0b11111;
            result.push(toBase32Char(value));
            unread -=5;
        }
    }

    if (unread > 0) {
        runningBits <<= 8;
        unread += 8;

        const value = (runningBits >> (unread - 5)) & 0b11111;
        result.push(toBase32Char(value));
    }

    return result.join('');
}

function fromBase32(password: string): Buffer {
    // 🤔 no .toUpperCase?
    password = password.toLowerCase();

    const result = Buffer.create(Math.trunc(password.length * 5 / 8));

    let outputIndex = 0;
    let unread = 0;
    let runningBits = 0;

    for (let i = 0; i < password.length; i++) {
        const next = fromBase32Char(password, i);
        if (next === -1) {
            return null;
        }

        runningBits = (runningBits << 5) | next;
        unread += 5;

        if (unread >= 8) {
            result.setUint8(outputIndex, (runningBits >>> (unread - 8)) & 0xff)
            unread -= 8;
            outputIndex++;
        }
    }

    return result;
}

const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'.split('');
const decodeAlphabet = alphabet.map(x => x.toLowerCase());
const replacements: { [key: string]: string } = { 'o': '0', 'i': '1', 'l': '1' };

function toBase32Char(val: number) {
    return alphabet[val];
}

function fromBase32Char(password: string, index: number) {
    const char = password.charAt(index);
    return decodeAlphabet.indexOf(replacements[char] || char);
}
