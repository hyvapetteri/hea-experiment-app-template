"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var dialogs = require("tns-core-modules/ui/dialogs");
var fs = require("tns-core-modules/file-system");
var user_1 = require("../../shared/user/user");
var router_1 = require("nativescript-angular/router");
var nativescript_audio_1 = require("nativescript-audio");
var environment_1 = require("../../config/environment");
var experiment_config_1 = require("./experiment-config");
var ExperimentPage = (function () {
    function ExperimentPage(userProvider, routerExtensions) {
        this.userProvider = userProvider;
        this.routerExtensions = routerExtensions;
        this.experimentLogText = [];
        this.player = new nativescript_audio_1.TNSPlayer();
        var appPath = fs.knownFolders.currentApp();
        this.audioPath = fs.path.join(appPath.path, 'audio');
        console.log(this.audioPath);
        this.sounds = experiment_config_1.sound_config;
        for (var i = this.sounds.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            _a = [this.sounds[j], this.sounds[i]], this.sounds[i] = _a[0], this.sounds[j] = _a[1];
        }
        this.soundIndex = 0;
        this.trialNumber = 0;
        this.loadSound();
        this.playButtonText = "Play next";
        this.instructionText = "Press play button to hear the sound.";
        this.enablePlay = true;
        this.enableAnswer = false;
        this.answered = false;
        this.uid = userProvider.username;
        var docsPath = fs.knownFolders.documents().path;
        var now = new Date();
        var logfile = environment_1.environment.experimentFilePrefix + this.uid + '-' + now.getHours() + '-' + now.getMinutes() + '-' + now.getDate() + '-' + now.getMonth() + '-' + now.getFullYear() + '.log';
        this.logFilePath = fs.path.join(docsPath, logfile);
        console.log('Logging to ' + logfile);
        this.writeLog('Experiment started, subject ' + this.uid);
        this.writeLog('trial; soundfile; answer; correct');
        var _a;
    }
    ExperimentPage.prototype.evaluateAnswer = function (answer) {
        var _this = this;
        this.enableAnswer = false;
        this.answered = true;
        this.enablePlay = true;
        return this.pauseSound().then(function () {
            _this.isCorrect = (answer == _this.soundCategory);
            if (_this.isCorrect) {
                _this.instructionText = 'Correct';
            }
            else {
                _this.instructionText = 'Wrong';
            }
            return _this.writeLog('' + (_this.soundIndex + 1) + ';' + _this.soundId + ';' + answer + ';' + _this.isCorrect);
        }).then(function () {
            _this.soundIndex += 1;
            return _this.loadSound();
        }).catch(function (err) { return _this.showError(err); });
    };
    ExperimentPage.prototype.loadSound = function () {
        var _this = this;
        if (this.soundIndex >= this.sounds.length) {
            return this.finishExperiment();
        }
        var soundInfo = this.sounds[this.soundIndex];
        this.soundId = soundInfo.id;
        this.soundCategory = soundInfo.cat;
        var soundpath = fs.path.join(this.audioPath, this.soundId);
        if (!fs.File.exists(soundpath)) {
            this.showError('Sound file ' + this.soundId + ' does not exist!');
            return new Promise(function (resolve, reject) { return reject('File not found'); });
        }
        return this.player.initFromFile({
            audioFile: soundpath,
            loop: false,
            errorCallback: function (error) {
                console.log(JSON.stringify(error));
            }
        }).catch(function (err) {
            _this.showError(err.extra);
        });
    };
    ExperimentPage.prototype.startSound = function () {
        var _this = this;
        if (this.player.isAudioPlaying()) {
            return new Promise(function (resolve, reject) { return resolve('playing'); });
        }
        return this.player.play().then(function () {
            _this.trialNumber += 1;
            _this.instructionText = "Is this sound A or B?";
            _this.enablePlay = false;
            _this.enableAnswer = true;
            _this.answered = false;
        }, function (err) { return _this.showError('could not start sound: ' + err); });
    };
    ExperimentPage.prototype.pauseSound = function () {
        var _this = this;
        if (!this.player.isAudioPlaying()) {
            return new Promise(function (resolve, reject) { return resolve('paused'); });
        }
        return this.player.pause().then(function () {
            return _this.player.dispose();
        });
    };
    ExperimentPage.prototype.writeLog = function (message) {
        var _this = this;
        this.experimentLogText.push(message);
        var fileHandle = fs.File.fromPath(this.logFilePath);
        var logstring = '';
        for (var _i = 0, _a = this.experimentLogText; _i < _a.length; _i++) {
            var row = _a[_i];
            logstring = logstring.concat(row + '\n');
        }
        return fileHandle.writeText(logstring).catch(function (err) {
            _this.showError(err);
        });
    };
    ExperimentPage.prototype.volumeDown = function () {
        if (this.volume > 0.1) {
            this.volume -= 0.1;
        }
        this.updateVolumeIcon();
        this.player.volume = this.volume;
    };
    ExperimentPage.prototype.volumeUp = function () {
        if (this.volume <= 0.9) {
            this.volume += 0.1;
        }
        this.updateVolumeIcon();
        this.player.volume = this.volume;
    };
    ExperimentPage.prototype.updateVolumeIcon = function () {
        if (this.volume <= 0.2) {
            this.volumeIcon = 'volume-mute';
        }
        else if (this.volume <= 0.6) {
            this.volumeIcon = 'volume-down';
        }
        else {
            this.volumeIcon = 'volume-up';
        }
    };
    ExperimentPage.prototype.showInstructions = function () {
    };
    ExperimentPage.prototype.showError = function (err) {
        dialogs.alert({
            title: 'Error',
            message: err,
            okButtonText: 'Close'
        }).then(function () {
            // pass
        });
    };
    ExperimentPage.prototype.finishExperiment = function () {
        var _this = this;
        dialogs.alert({
            title: 'Experiment completed',
            message: 'The experiment is now finished, thank you for participating!',
            okButtonText: 'OK'
        }).then(function () {
            _this.userProvider.username = '';
            _this.userProvider.age = null;
            return _this.routerExtensions.navigate(['/start'], { clearHistory: true });
        }).catch(function (err) {
            _this.showError(err);
        });
    };
    ExperimentPage.prototype.abortExperiment = function () {
        var _this = this;
        dialogs.confirm({
            title: 'Abort experiment?',
            message: 'The experiment is not finished, are you sure you want to abort? You cannot continue the experiment after quitting.',
            okButtonText: 'Quit',
            cancelButtonText: 'Continue'
        }).then(function (ans) {
            if (ans) {
                _this.userProvider.username = '';
                _this.userProvider.age = null;
                return _this.routerExtensions.navigate(['/start'], { clearHistory: true });
            }
        });
    };
    ExperimentPage = __decorate([
        core_1.Component({
            moduleId: module.id,
            selector: 'page-experiment',
            templateUrl: './experiment.html',
            styleUrls: ['./experiment.css']
        }),
        __metadata("design:paramtypes", [user_1.UserProvider,
            router_1.RouterExtensions])
    ], ExperimentPage);
    return ExperimentPage;
}());
exports.ExperimentPage = ExperimentPage;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwZXJpbWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImV4cGVyaW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxzQ0FBMEM7QUFDMUMscURBQXVEO0FBQ3ZELGlEQUFtRDtBQUVuRCwrQ0FBc0Q7QUFDdEQsc0RBQStEO0FBRS9ELHlEQUErQztBQUUvQyx3REFBdUQ7QUFDdkQseURBQW1EO0FBVW5EO0lBd0JFLHdCQUFvQixZQUEwQixFQUMxQixnQkFBa0M7UUFEbEMsaUJBQVksR0FBWixZQUFZLENBQWM7UUFDMUIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUg5QyxzQkFBaUIsR0FBa0IsRUFBRSxDQUFDO1FBSzVDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSw4QkFBUyxFQUFFLENBQUM7UUFDOUIsSUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUMzQyxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDckQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFNUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxnQ0FBWSxDQUFDO1FBRTNCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDaEQsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QyxxQ0FBbUUsRUFBbEUsc0JBQWMsRUFBRSxzQkFBYyxDQUFxQztRQUN0RSxDQUFDO1FBRUQsSUFBSSxDQUFD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ZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgKiBhcyBkaWFsb2dzIGZyb20gXCJ0bnMtY29yZS1tb2R1bGVzL3VpL2RpYWxvZ3NcIjtcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJ0bnMtY29yZS1tb2R1bGVzL2ZpbGUtc3lzdGVtXCI7XG5cbmltcG9ydCB7IFVzZXJQcm92aWRlciB9IGZyb20gJy4uLy4uL3NoYXJlZC91c2VyL3VzZXInO1xuaW1wb3J0IHsgUm91dGVyRXh0ZW5zaW9ucyB9IGZyb20gJ25hdGl2ZXNjcmlwdC1hbmd1bGFyL3JvdXRlcic7XG5cbmltcG9ydCB7IFROU1BsYXllciB9IGZyb20gJ25hdGl2ZXNjcmlwdC1hdWRpbyc7XG5cbmltcG9ydCB7IGVudmlyb25tZW50IH0gZnJvbSAnLi4vLi4vY29uZmlnL2Vudmlyb25tZW50JztcbmltcG9ydCB7IHNvdW5kX2NvbmZpZyB9IGZyb20gJy4vZXhwZXJpbWVudC1jb25maWcnO1xuXG5kZWNsYXJlIHZhciBOU1VSTDtcblxuQENvbXBvbmVudCh7XG4gIG1vZHVsZUlkOiBtb2R1bGUuaWQsXG4gIHNlbGVjdG9yOiAncGFnZS1leHBlcmltZW50JyxcbiAgdGVtcGxhdGVVcmw6ICcuL2V4cGVyaW1lbnQuaHRtbCcsXG4gIHN0eWxlVXJsczogWycuL2V4cGVyaW1lbnQuY3NzJ11cbn0pXG5leHBvcnQgY2xhc3MgRXhwZXJpbWVudFBhZ2Uge1xuXG4gIHByaXZhdGUgdm9sdW1lOiBudW1iZXI7XG4gIHByaXZhdGUgc291bmRJbmRleDogbnVtYmVyO1xuICBwcml2YXRlIHRyaWFsTnVtYmVyOiBudW1iZXI7XG4gIHByaXZhdGUgc291bmRJZDogc3RyaW5nO1xuICBwcml2YXRlIHNvdW5kQ2F0ZWdvcnk6IHN0cmluZztcbiAgcHJpdmF0ZSB1aWQ6IHN0cmluZztcbiAgcHJpdmF0ZSBhdWRpb1BhdGg6IHN0cmluZztcbiAgcHJpdmF0ZSB2b2x1bWVJY29uOiBzdHJpbmc7XG4gIHByaXZhdGUgcGxheWVyOiBUTlNQbGF5ZXI7XG4gIHByaXZhdGUgc291bmRzOiBBcnJheTxhbnk+O1xuXG4gIHByaXZhdGUgaXNDb3JyZWN0OiBib29sZWFuO1xuXG4gIHByaXZhdGUgcGxheUJ1dHRvblRleHQ6IHN0cmluZztcbiAgcHJpdmF0ZSBpbnN0cnVjdGlvblRleHQ6IHN0cmluZztcbiAgcHJpdmF0ZSBlbmFibGVQbGF5OiBib29sZWFuO1xuICBwcml2YXRlIGVuYWJsZUFuc3dlcjogYm9vbGVhbjtcbiAgcHJpdmF0ZSBhbnN3ZXJlZDogYm9vbGVhbjtcblxuICBwcml2YXRlIGxvZ0ZpbGVQYXRoOiBzdHJpbmc7XG4gIHByaXZhdGUgZXhwZXJpbWVudExvZ1RleHQ6IEFycmF5PHN0cmluZz4gPSBbXTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHVzZXJQcm92aWRlcjogVXNlclByb3ZpZGVyLFxuICAgICAgICAgICAgICBwcml2YXRlIHJvdXRlckV4dGVuc2lvbnM6IFJvdXRlckV4dGVuc2lvbnMpIHtcblxuICAgIHRoaXMucGxheWVyID0gbmV3IFROU1BsYXllcigpO1xuICAgIGxldCBhcHBQYXRoID0gZnMua25vd25Gb2xkZXJzLmN1cnJlbnRBcHAoKTtcbiAgICB0aGlzLmF1ZGlvUGF0aCA9IGZzLnBhdGguam9pbihhcHBQYXRoLnBhdGgsICdhdWRpbycpO1xuICAgIGNvbnNvbGUubG9nKHRoaXMuYXVkaW9QYXRoKTtcblxuICAgIHRoaXMuc291bmRzID0gc291bmRfY29uZmlnO1xuXG4gICAgZm9yIChsZXQgaSA9IHRoaXMuc291bmRzLmxlbmd0aCAtIDE7IGkgPiAwOyBpLS0pIHtcbiAgICAgIGxldCBqID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKGkgKyAxKSk7XG4gICAgICBbdGhpcy5zb3VuZHNbaV0sIHRoaXMuc291bmRzW2pdXSA9IFt0aGlzLnNvdW5kc1tqXSwgdGhpcy5zb3VuZHNbaV1dO1xuICAgIH1cblxuICAgIHRoaXMuc291bmRJbmRleCA9IDA7XG4gICAgdGhpcy50cmlhbE51bWJlciA9IDA7XG4gICAgdGhpcy5sb2FkU291bmQoKTtcblxuICAgIHRoaXMucGxheUJ1dHRvblRleHQgPSBcIlBsYXkgbmV4dFwiO1xuICAgIHRoaXMuaW5zdHJ1Y3Rpb25UZXh0ID0gXCJQcmVzcyBwbGF5IGJ1dHRvbiB0byBoZWFyIHRoZSBzb3VuZC5cIjtcblxuICAgIHRoaXMuZW5hYmxlUGxheSA9IHRydWU7XG4gICAgdGhpcy5lbmFibGVBbnN3ZXIgPSBmYWxzZTtcbiAgICB0aGlzLmFuc3dlcmVkID0gZmFsc2U7XG5cbiAgICB0aGlzLnVpZCA9IHVzZXJQcm92aWRlci51c2VybmFtZTtcblxuICAgIGxldCBkb2NzUGF0aCA9IGZzLmtub3duRm9sZGVycy5kb2N1bWVudHMoKS5wYXRoO1xuICAgIGxldCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgIGxldCBsb2dmaWxlID0gZW52aXJvbm1lbnQuZXhwZXJpbWVudEZpbGVQcmVmaXggKyB0aGlzLnVpZCArICctJyArIG5vdy5nZXRIb3VycygpICsgJy0nICsgbm93LmdldE1pbnV0ZXMoKSArICctJyArIG5vdy5nZXREYXRlKCkgKyAnLScgKyBub3cuZ2V0TW9udGgoKSArICctJyArIG5vdy5nZXRGdWxsWWVhcigpICsgJy5sb2cnO1xuICAgIHRoaXMubG9nRmlsZVBhdGggPSBmcy5wYXRoLmpvaW4oZG9jc1BhdGgsIGxvZ2ZpbGUpO1xuICAgIGNvbnNvbGUubG9nKCdMb2dnaW5nIHRvICcgKyBsb2dmaWxlKTtcbiAgICB0aGlzLndyaXRlTG9nKCdFeHBlcmltZW50IHN0YXJ0ZWQsIHN1YmplY3QgJyArIHRoaXMudWlkKTtcbiAgICB0aGlzLndyaXRlTG9nKCd0cmlhbDsgc291bmRmaWxlOyBhbnN3ZXI7IGNvcnJlY3QnKTtcbiAgfVxuXG4gIGV2YWx1YXRlQW5zd2VyKGFuc3dlcikge1xuICAgIHRoaXMuZW5hYmxlQW5zd2VyID0gZmFsc2U7XG4gICAgdGhpcy5hbnN3ZXJlZCA9IHRydWU7XG4gICAgdGhpcy5lbmFibGVQbGF5ID0gdHJ1ZTtcblxuICAgIHJldHVybiB0aGlzLnBhdXNlU291bmQoKS50aGVuKCgpID0+IHtcbiAgICAgIHRoaXMuaXNDb3JyZWN0ID0gKGFuc3dlciA9PSB0aGlzLnNvdW5kQ2F0ZWdvcnkpO1xuICAgICAgaWYgKHRoaXMuaXNDb3JyZWN0KSB7XG4gICAgICAgIHRoaXMuaW5zdHJ1Y3Rpb25UZXh0ID0gJ0NvcnJlY3QnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5pbnN0cnVjdGlvblRleHQgPSAnV3JvbmcnO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy53cml0ZUxvZygnJyArICh0aGlzLnNvdW5kSW5kZXgrMSkgKyAnOycgKyB0aGlzLnNvdW5kSWQgKyAnOycgKyBhbnN3ZXIgKyAnOycgKyB0aGlzLmlzQ29ycmVjdCk7XG4gICAgfSkudGhlbigoKSA9PiB7XG4gICAgICB0aGlzLnNvdW5kSW5kZXggKz0gMTtcbiAgICAgIHJldHVybiB0aGlzLmxvYWRTb3VuZCgpO1xuICAgIH0pLmNhdGNoKGVyciA9PiB0aGlzLnNob3dFcnJvcihlcnIpKTtcbiAgfVxuXG4gIGxvYWRTb3VuZCgpIHtcbiAgICBpZiAodGhpcy5zb3VuZEluZGV4ID49IHRoaXMuc291bmRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHRoaXMuZmluaXNoRXhwZXJpbWVudCgpO1xuICAgIH1cbiAgICBsZXQgc291bmRJbmZvID0gdGhpcy5zb3VuZHNbdGhpcy5zb3VuZEluZGV4XTtcbiAgICB0aGlzLnNvdW5kSWQgPSBzb3VuZEluZm8uaWQ7XG4gICAgdGhpcy5zb3VuZENhdGVnb3J5ID0gc291bmRJbmZvLmNhdDtcblxuICAgIGxldCBzb3VuZHBhdGggPSBmcy5wYXRoLmpvaW4odGhpcy5hdWRpb1BhdGgsIHRoaXMuc291bmRJZCk7XG4gICAgaWYgKCFmcy5GaWxlLmV4aXN0cyhzb3VuZHBhdGgpKSB7XG4gICAgICB0aGlzLnNob3dFcnJvcignU291bmQgZmlsZSAnICsgdGhpcy5zb3VuZElkICsgJyBkb2VzIG5vdCBleGlzdCEnKTtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiByZWplY3QoJ0ZpbGUgbm90IGZvdW5kJykpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5wbGF5ZXIuaW5pdEZyb21GaWxlKHtcbiAgICAgIGF1ZGlvRmlsZTogc291bmRwYXRoLFxuICAgICAgbG9vcDogZmFsc2UsXG4gICAgICBlcnJvckNhbGxiYWNrOiBlcnJvciA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGVycm9yKSk7XG4gICAgICB9XG4gICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgIHRoaXMuc2hvd0Vycm9yKGVyci5leHRyYSk7XG4gICAgfSk7XG4gIH1cblxuICBzdGFydFNvdW5kKCkge1xuICAgIGlmICh0aGlzLnBsYXllci5pc0F1ZGlvUGxheWluZygpKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4gcmVzb2x2ZSgncGxheWluZycpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucGxheWVyLnBsYXkoKS50aGVuKFxuICAgICAgKCkgPT4ge1xuICAgICAgICB0aGlzLnRyaWFsTnVtYmVyICs9IDE7XG4gICAgICAgIHRoaXMuaW5zdHJ1Y3Rpb25UZXh0ID0gXCJJcyB0aGlzIHNvdW5kIEEgb3IgQj9cIjtcbiAgICAgICAgdGhpcy5lbmFibGVQbGF5ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuZW5hYmxlQW5zd2VyID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5hbnN3ZXJlZCA9IGZhbHNlO1xuICAgICAgfSxcbiAgICAgIGVyciA9PiB0aGlzLnNob3dFcnJvcignY291bGQgbm90IHN0YXJ0IHNvdW5kOiAnICsgZXJyKVxuICAgICk7XG4gIH1cblxuICBwYXVzZVNvdW5kKCkge1xuICAgIGlmICghdGhpcy5wbGF5ZXIuaXNBdWRpb1BsYXlpbmcoKSkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHJlc29sdmUoJ3BhdXNlZCcpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucGxheWVyLnBhdXNlKCkudGhlbihcbiAgICAgICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGxheWVyLmRpc3Bvc2UoKTtcbiAgICAgIH1cbiAgICApO1xuICB9XG5cbiAgd3JpdGVMb2cobWVzc2FnZTogc3RyaW5nKSB7XG4gICAgdGhpcy5leHBlcmltZW50TG9nVGV4dC5wdXNoKG1lc3NhZ2UpO1xuXG4gICAgbGV0IGZpbGVIYW5kbGUgPSBmcy5GaWxlLmZyb21QYXRoKHRoaXMubG9nRmlsZVBhdGgpO1xuICAgIGxldCBsb2dzdHJpbmcgPSAnJztcbiAgICBmb3IgKGxldCByb3cgb2YgdGhpcy5leHBlcmltZW50TG9nVGV4dCkge1xuICAgICAgbG9nc3RyaW5nID0gbG9nc3RyaW5nLmNvbmNhdChyb3cgKyAnXFxuJyk7XG4gICAgfVxuICAgIHJldHVybiBmaWxlSGFuZGxlLndyaXRlVGV4dChsb2dzdHJpbmcpLmNhdGNoKGVyciA9PiB7XG4gICAgICB0aGlzLnNob3dFcnJvcihlcnIpO1xuICAgIH0pO1xuICB9XG5cbiAgdm9sdW1lRG93bigpIHtcbiAgICBpZiAodGhpcy52b2x1bWUgPiAwLjEpIHtcbiAgICAgIHRoaXMudm9sdW1lIC09IDAuMTtcbiAgICB9XG4gICAgdGhpcy51cGRhdGVWb2x1bWVJY29uKCk7XG4gICAgdGhpcy5wbGF5ZXIudm9sdW1lID0gdGhpcy52b2x1bWU7XG4gIH1cblxuICB2b2x1bWVVcCgpIHtcbiAgICBpZiAodGhpcy52b2x1bWUgPD0gMC45KSB7XG4gICAgICB0aGlzLnZvbHVtZSArPSAwLjE7XG4gICAgfVxuICAgIHRoaXMudXBkYXRlVm9sdW1lSWNvbigpO1xuICAgIHRoaXMucGxheWVyLnZvbHVtZSA9ICB0aGlzLnZvbHVtZTtcbiAgfVxuXG4gIHVwZGF0ZVZvbHVtZUljb24oKSB7XG4gICAgaWYgKHRoaXMudm9sdW1lIDw9IDAuMikge1xuICAgICAgdGhpcy52b2x1bWVJY29uID0gJ3ZvbHVtZS1tdXRlJztcbiAgICB9IGVsc2UgaWYgKHRoaXMudm9sdW1lIDw9IDAuNikge1xuICAgICAgdGhpcy52b2x1bWVJY29uID0gJ3ZvbHVtZS1kb3duJztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy52b2x1bWVJY29uID0gJ3ZvbHVtZS11cCc7XG4gICAgfVxuICB9XG5cbiAgc2hvd0luc3RydWN0aW9ucygpIHtcblxuICB9XG5cbiAgc2hvd0Vycm9yKGVycikge1xuICAgIGRpYWxvZ3MuYWxlcnQoe1xuICAgICAgdGl0bGU6ICdFcnJvcicsXG4gICAgICBtZXNzYWdlOiBlcnIsXG4gICAgICBva0J1dHRvblRleHQ6ICdDbG9zZSdcbiAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgIC8vIHBhc3NcbiAgICB9KTtcbiAgfVxuXG4gIGZpbmlzaEV4cGVyaW1lbnQoKSB7XG4gICAgZGlhbG9ncy5hbGVydCh7XG4gICAgICB0aXRsZTogJ0V4cGVyaW1lbnQgY29tcGxldGVkJyxcbiAgICAgIG1lc3NhZ2U6ICdUaGUgZXhwZXJpbWVudCBpcyBub3cgZmluaXNoZWQsIHRoYW5rIHlvdSBmb3IgcGFydGljaXBhdGluZyEnLFxuICAgICAgb2tCdXR0b25UZXh0OiAnT0snXG4gICAgfSkudGhlbigoKSA9PiB7XG4gICAgICB0aGlzLnVzZXJQcm92aWRlci51c2VybmFtZSA9ICcnO1xuICAgICAgdGhpcy51c2VyUHJvdmlkZXIuYWdlID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHRoaXMucm91dGVyRXh0ZW5zaW9ucy5uYXZpZ2F0ZShbJy9zdGFydCddLCB7Y2xlYXJIaXN0b3J5OiB0cnVlfSk7XG4gICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgIHRoaXMuc2hvd0Vycm9yKGVycik7XG4gICAgfSk7XG4gIH1cblxuICBhYm9ydEV4cGVyaW1lbnQoKSB7XG4gICAgZGlhbG9ncy5jb25maXJtKHtcbiAgICAgIHRpdGxlOiAnQWJvcnQgZXhwZXJpbWVudD8nLFxuICAgICAgbWVzc2FnZTogJ1RoZSBleHBlcmltZW50IGlzIG5vdCBmaW5pc2hlZCwgYXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGFib3J0PyBZb3UgY2Fubm90IGNvbnRpbnVlIHRoZSBleHBlcmltZW50IGFmdGVyIHF1aXR0aW5nLicsXG4gICAgICBva0J1dHRvblRleHQ6ICdRdWl0JyxcbiAgICAgIGNhbmNlbEJ1dHRvblRleHQ6ICdDb250aW51ZSdcbiAgICB9KS50aGVuKGFucyA9PiB7XG4gICAgICBpZiAoYW5zKSB7XG4gICAgICAgIHRoaXMudXNlclByb3ZpZGVyLnVzZXJuYW1lID0gJyc7XG4gICAgICAgIHRoaXMudXNlclByb3ZpZGVyLmFnZSA9IG51bGw7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMucm91dGVyRXh0ZW5zaW9ucy5uYXZpZ2F0ZShbJy9zdGFydCddLCB7Y2xlYXJIaXN0b3J5OiB0cnVlfSk7XG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG59XG4iXX0=