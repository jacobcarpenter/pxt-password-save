// tests go here; this will not be compiled when this package is used as an extension.

function ShowSaveData (label: string) {
    game.splash(label, "Level=" + saveFormat.getSmallNumber(NumberValueKind.Level) + " ETANK1?=" + saveFormat.getFlag(FlagValueKind.FoundEnergyTank1))
}

function setDataAndShowPassword () {
    saveFormat.setSmallNumber(NumberValueKind.Level, randint(1, 99))
    saveFormat.setFlag(FlagValueKind.FoundEnergyTank1, Math.percentChance(50))
    ShowSaveData("after setting values")
    pwsave.splashPassword(saveFormat)
}

function promptForPassword () {
    if (pwsave.promptForPassword(saveFormat)) {
        ShowSaveData("after loading")
    }
}

let saveFormat: pwsave.PasswordData = null
saveFormat = pwsave.create()
saveFormat.registerSmallNumber(NumberValueKind.Level)
saveFormat.registerFlag(FlagValueKind.FoundEnergyTank1)

ShowSaveData("initial data")
setDataAndShowPassword()

game.splash("Clearing saved data!")
saveFormat.clearAllData()

ShowSaveData("after clearing")

promptForPassword()
