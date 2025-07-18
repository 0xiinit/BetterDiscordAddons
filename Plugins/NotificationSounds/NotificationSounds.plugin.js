/**
 * @name NotificationSounds
 * @author DevilBro
 * @authorId 278543574059057154
 * @version 4.0.3
 * @description Allows you to replace the native Sounds with custom Sounds
 * @invite Jx3TjNS
 * @donate https://www.paypal.me/MircoWittrien
 * @patreon https://www.patreon.com/MircoWittrien
 * @website https://mwittrien.github.io/
 * @source https://github.com/mwittrien/BetterDiscordAddons/tree/master/Plugins/NotificationSounds/
 * @updateUrl https://mwittrien.github.io/BetterDiscordAddons/Plugins/NotificationSounds/NotificationSounds.plugin.js
 */

module.exports = (_ => {
	const changeLog = {
		
	};

	return !window.BDFDB_Global || (!window.BDFDB_Global.loaded && !window.BDFDB_Global.started) ? class {
		constructor (meta) {for (let key in meta) this[key] = meta[key];}
		getName () {return this.name;}
		getAuthor () {return this.author;}
		getVersion () {return this.version;}
		getDescription () {return `The Library Plugin needed for ${this.name} is missing. Open the Plugin Settings to download it. \n\n${this.description}`;}
		
		downloadLibrary () {
			BdApi.Net.fetch("https://mwittrien.github.io/BetterDiscordAddons/Library/0BDFDB.plugin.js").then(r => {
				if (!r || r.status != 200) throw new Error();
				else return r.text();
			}).then(b => {
				if (!b) throw new Error();
				else return require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0BDFDB.plugin.js"), b, _ => BdApi.UI.showToast("Finished downloading BDFDB Library", {type: "success"}));
			}).catch(error => {
				BdApi.UI.alert("Error", "Could not download BDFDB Library Plugin. Try again later or download it manually from GitHub: https://mwittrien.github.io/downloader/?library");
			});
		}
		
		load () {
			if (!window.BDFDB_Global || !Array.isArray(window.BDFDB_Global.pluginQueue)) window.BDFDB_Global = Object.assign({}, window.BDFDB_Global, {pluginQueue: []});
			if (!window.BDFDB_Global.downloadModal) {
				window.BDFDB_Global.downloadModal = true;
				BdApi.UI.showConfirmationModal("Library Missing", `The Library Plugin needed for ${this.name} is missing. Please click "Download Now" to install it.`, {
					confirmText: "Download Now",
					cancelText: "Cancel",
					onCancel: _ => {delete window.BDFDB_Global.downloadModal;},
					onConfirm: _ => {
						delete window.BDFDB_Global.downloadModal;
						this.downloadLibrary();
					}
				});
			}
			if (!window.BDFDB_Global.pluginQueue.includes(this.name)) window.BDFDB_Global.pluginQueue.push(this.name);
		}
		start () {this.load();}
		stop () {}
		getSettingsPanel () {
			let template = document.createElement("template");
			template.innerHTML = `<div style="color: var(--text-primary); font-size: 16px; font-weight: 300; white-space: pre; line-height: 22px;">The Library Plugin needed for ${this.name} is missing.\nPlease click <a style="font-weight: 500;">Download Now</a> to install it.</div>`;
			template.content.firstElementChild.querySelector("a").addEventListener("click", this.downloadLibrary);
			return template.content.firstElementChild;
		}
	} : (([Plugin, BDFDB]) => {
		var audios, choices, firedEvents;
		var volumes = {};
		var toggles = {};
		
		const removeAllKey = "REMOVE_ALL_BDFDB_DEVILBRO_DO_NOT_COPY";
		const defaultDevice = "default";
		
		var currentDevice = defaultDevice, createdAudios = {};
		
		let types = {}, soundPacks = [];
		
		const message1Types = {
			dm:		{src: "./message3.mp3", name: "Message (Direct Message)"},
			groupdm:	{src: "./message3.mp3", name: "Message (Group Message)"},
			mentioned:	{src: "./message2.mp3", name: "Message Mentioned"},
			reply:		{src: "./message2.mp3", name: "Message Mentioned (reply)"},
			role:		{src: "./mention1.mp3", name: "Message Mentioned (role)"},
			everyone:	{src: "./mention2.mp3", name: "Message Mentioned (@everyone)"},
			here:		{src: "./mention3.mp3", name: "Message Mentioned (@here)"}
		};
		
		const namePrefixes = {
			"user_join":	"Voice Channel",
			"user_leave":	"Voice Channel",
			"user_moved":	"Voice Channel"
		};
		
		const nameSynonymes = {
			"message3":	"Message (Current Channel)",
			"reconnect":	"Invited To Speak"
		};
		
		const defaultAudios = {
			"---": {
				"---": null
			},
			"Discord": {}
		};
		
		const WebAudioSound = class WebAudioSound {
			constructor (type) {
				this.name = type;
				this._src = choices[type] && audios[choices[type].category][choices[type].sound] || types[type] && types[type].src || BDFDB.LibraryModules.SoundParser(`./${type}.mp3`);
				this._volume = (choices[type] ? choices[type].volume : 100) / 100;
			}
			loop () {
				this._ensureAudio().then(audio => {
					audio.loop = true;
					audio.play();
				});
			}
			play () {
				this._ensureAudio().then(audio => {
					audio.loop = false;
					audio.play();
				});
			}
			playWithListener (duration) {
				return new Promise((callback, errorCallback) => {
					this._ensureAudio().then(audio => {
						if (!duration && duration !== 0) errorCallback(new Error("sound has no duration"));
						audio.loop = false;
						audio.play();
						setTimeout(_ => callback(true), duration);
					});
				});
			}
			pause () {
				this._audio.then(audio => {
					audio.pause();
				});
			}
			stop () {
				this._destroyAudio();
			}
			setTime (time) {
				this._audio.then(audio => {
					audio.currentTime = time;
				});
			}
			setLoop (loop) {
				this._audio.then(audio => {
					audio.loop = loop;
				});
			}
			_destroyAudio () {
				if (this._audio) {
					this._audio.then(audio => {
						audio.pause();
						audio.src = "";
					});
					this._audio = null;
				}
			}
			_ensureAudio () {
				return this._audio = this._audio || new Promise((callback, errorCallback) => {
					let audio = new Audio;
					audio.src = this._src && this._src.startsWith("data") ? this._src.replace(/ /g, "") : this._src;
					audio.onloadeddata = _ => {
						audio.volume = Math.min((BDFDB.LibraryStores.MediaEngineStore.getOutputVolume() / 100) * this._volume * (volumes.globalVolume / 100), 1);
						BDFDB.DiscordUtils.isPlaformEmbedded() && audio.setSinkId(currentDevice || defaultDevice);
						callback(audio);
					};
					audio.onerror = _ => errorCallback(new Error("could not play audio"));
					audio.onended = _ => this._destroyAudio();
					audio.load();
				}), this._audio;
			}
		};
	
		return class NotificationSounds extends Plugin {
			onLoad () {
				audios = {};
				choices = {};
				firedEvents = {};
				
				this.defaults = {
					volumes: {
						globalVolume:		{value: 100,	description: "Global Notification Sounds Volume"}
					},
					toggles: {
						playIfMuted: 		{value: false,	description: "Play Sounds If Muted"}
					}
				};
				
				this.patchPriority = 9;
			}
			
			onStart () {
				soundPacks = [];
				const soundKeys = BDFDB.LibraryModules.SoundParser.keys();
				for (let key of soundKeys) {	
					const id = key.replace("./", "").replace(".mp3", "");
					const name = [namePrefixes[id], (nameSynonymes[id] || id).replace("ddr-", "HotKeys_").replace("ptt_", "Push2Talk_").split(/[_-]/)].flat(10).filter(n => n).map(BDFDB.StringUtils.upperCaseFirstChar).join(" ").replace(/1$/g, "");
					const src = BDFDB.LibraryModules.SoundParser(key);	
					
					let soundPackName = id.split("_")[0];
					if (soundPackName != id && soundKeys.filter(n => n.indexOf(`./${soundPackName}`) > -1).length > 8) {
						soundPacks.push(soundPackName);
						soundPackName = BDFDB.StringUtils.upperCaseFirstChar(soundPackName);
						if (!defaultAudios[soundPackName]) defaultAudios[soundPackName] = {};
						defaultAudios[soundPackName][name.replace(new RegExp(`${soundPackName} `, "i"), "").replace(/bootup/i, "Discodo")] = src;
					}
					else {
						defaultAudios.Discord[name] = src;
						if (this.isSoundUsedAnywhere(id)) types[id] = {
							name: name,
							src: src,
							mute: id.startsWith("call_") ? null : false,
							streamMute: false,
							invisibleMute: false
						};
						if (id == "message1" || id == "message3") {
							types[id].mute = true;
							types[id].streamMute = false;
							types[id].invisibleMute = false;
							if (id == "message1") for (let subType in message1Types) types[subType] = {
								name: message1Types[subType].name,
								src: BDFDB.LibraryModules.SoundParser(message1Types[subType].src),
								mute: true,
								streamMute: false,
								invisibleMute: false
							}
						}
					}
					types = BDFDB.ObjectUtils.sort(types, "name");
				}
				for (let pack in defaultAudios) defaultAudios[pack] = BDFDB.ObjectUtils.sort(defaultAudios[pack]);
				
				if (BDFDB.DiscordUtils.isPlaformEmbedded()) {
					let change = _ => {
						if (window.navigator.mediaDevices && window.navigator.mediaDevices.enumerateDevices) {
							window.navigator.mediaDevices.enumerateDevices().then(enumeratedDevices => {
								let id = BDFDB.LibraryStores.MediaEngineStore.getOutputDeviceId();
								let allDevices = BDFDB.LibraryStores.MediaEngineStore.getOutputDevices();
								let filteredDevices = enumeratedDevices.filter(d => d.kind == "audiooutput" && d.deviceId != "communications");
								let deviceIndex = BDFDB.LibraryModules.ArrayUtils(allDevices).sortBy(d => d.index).findIndex(d => d.id == id);
								let deviceViaId = allDevices[id];
								let deviceViaIndex = filteredDevices[deviceIndex];
								if (deviceViaId && deviceViaIndex && deviceViaIndex.label != deviceViaId.name) deviceViaIndex = filteredDevices.find(d => d.label == deviceViaId.name);
								currentDevice = deviceViaIndex ? deviceViaIndex.deviceId : defaultDevice;
							}).catch(_ => {
								currentDevice = defaultDevice;
							});
						}
					};
					BDFDB.StoreChangeUtils.add(this, BDFDB.LibraryStores.MediaEngineStore, change);
					change();
				}
				
				BDFDB.PatchUtils.patch(this, BDFDB.LibraryModules.DispatchApiUtils, "dispatch", {before: e => {
					if (BDFDB.ObjectUtils.is(e.methodArguments[0]) && e.methodArguments[0].type == "MESSAGE_CREATE" && e.methodArguments[0].message) {
						const message = e.methodArguments[0].message;
						const guildId = message.guild_id || null;
						if (message.author.id != BDFDB.UserUtils.me.id && !BDFDB.LibraryStores.RelationshipStore.isBlocked(message.author.id)) {
							const channel = BDFDB.LibraryStores.ChannelStore.getChannel(message.channel_id);
							
							const isCurrent = BDFDB.LibraryStores.SelectedChannelStore.getChannelId() == channel.id;
							const isGroupDM = channel.isGroupDM();
							const isThread = BDFDB.ChannelUtils.isThread(channel);
							const isCurrentAndFocused = isCurrent && document.hasFocus();
							
							if (!toggles.playIfMuted) {
								if ((isThread && BDFDB.LibraryStores.JoinedThreadsStore.isMuted(channel.id)) || (!isThread && BDFDB.LibraryStores.UserGuildSettingsStore.isGuildOrCategoryOrChannelMuted(guildId, channel.id))) return;
							}
							
							if (isCurrent && BDFDB.LibraryStores.NotificationSettingsStore.getNotifyMessagesInSelectedChannel()) {
								this.fireEvent("message3");
								this.playAudio("message3");
								return;
							}
							else if (!guildId) {
								this.fireEvent(isGroupDM ? "groupdm" : "dm");
								!isCurrentAndFocused && this.playAudio(isGroupDM ? "groupdm" : "dm");
								return;
							}
							else if (guildId) {
								if (BDFDB.LibraryModules.MentionUtils.isRawMessageMentioned({rawMessage: message, userId: BDFDB.UserUtils.me.id})) {
									if (message.mentions.length && !this.isSuppressMentionsEnabled(guildId, channel.id)) for (const mention of message.mentions) if (mention.id == BDFDB.UserUtils.me.id) {
										if (message.message_reference && !message.interaction) {
											this.fireEvent("reply");
											!isCurrentAndFocused && this.playAudio("reply");
											return;
										}
										if (!message.message_reference) {
											this.fireEvent("mentioned");
											!isCurrentAndFocused && this.playAudio("mentioned");
											return;
										}
									}
									if (message.mention_roles.length && !BDFDB.LibraryStores.UserGuildSettingsStore.isSuppressRolesEnabled(guildId, channel.id)) {
										const member = BDFDB.LibraryStores.GuildMemberStore.getMember(guildId, BDFDB.UserUtils.me.id);
										if (member && member.roles.length) for (const roleId of message.mention_roles) if (member.roles.includes(roleId)) {
											this.fireEvent("role");
											!isCurrentAndFocused && this.playAudio("role");
											return;
										}
									}
									if (message.mention_everyone && !BDFDB.LibraryStores.UserGuildSettingsStore.isSuppressEveryoneEnabled(guildId, channel.id)) {
										if (message.content.indexOf("@everyone") > -1) {
											this.fireEvent("everyone");
											!isCurrentAndFocused && this.playAudio("everyone");
											return;
										}
										if (message.content.indexOf("@here") > -1) {
											this.fireEvent("here");
											!isCurrentAndFocused && this.playAudio("here");
											return;
										}
									}
								}
								if (BDFDB.LibraryStores.UserGuildSettingsStore.allowAllMessages(channel) && !(isThread && !BDFDB.LibraryStores.JoinedThreadsStore.hasJoined(channel.id))) {
									this.fireEvent("message1");
									!isCurrentAndFocused && this.playAudio("message1");
									return;
								}
							}
						}
					}
				}});
				
				BDFDB.PatchUtils.patch(this, BDFDB.LibraryModules.DesktopNotificationUtils, "showNotification", {before: e => {
					let soundObjIndex = Array.from(e.methodArguments).findIndex(n => n && n.sound);
					if (soundObjIndex && e.methodArguments[soundObjIndex].sound.includes("message")) e.methodArguments[soundObjIndex].sound = null;
				}});
				if (BDFDB.LibraryModules.SoundUtils && BDFDB.LibraryModules.SoundUtils.createSound) {
					let cancel = BDFDB.PatchUtils.patch(this, BDFDB.LibraryModules.SoundUtils, "createSound", {after: e => {
						if (e.returnValue && e.returnValue.constructor && e.returnValue.constructor.prototype && typeof e.returnValue.constructor.prototype.play == "function") {
							cancel();
							BDFDB.PatchUtils.patch(this, e.returnValue.constructor.prototype, ["play", "loop", "playWithListener"], {instead: e2 => {
								let type = e2.instance && e2.instance.name;
								if (type && choices[type]) {
									e2.stopOriginalMethodCall();
									if (type == "message1" || type == "message3") BDFDB.TimeUtils.timeout(_ => {
										let called = false;
										for (let subType of [type].concat(Object.keys(message1Types))) if (firedEvents[subType]) {
											delete firedEvents[subType];
											called = true;
											break;
										}
										if (!called) return this.playAudio(type, e2.originalMethodName, e2.instance.duration);
									});
									else return this.playAudio(type, e2.originalMethodName, e2.instance.duration);
								}
								else return this.playAudio(type, e2.originalMethodName, e2.instance.duration);
							}});
							BDFDB.PatchUtils.patch(this, e.returnValue.constructor.prototype, "stop", {after: e2 => {
								let type = e2.instance && e2.instance.name;
								if (type && createdAudios[type]) createdAudios[type].stop();
							}});
						}
					}}, {noCache: true});
					BDFDB.LibraryModules.SoundUtils.createSound("call_calling");
				}

				this.loadAudios();
				this.loadChoices();
				
				this.forceUpdateAll();
			}
			
			onStop () {
				for (let type in createdAudios) if (createdAudios[type]) createdAudios[type].stop();
			}

			getSettingsPanel (collapseStates = {}) {
				let successSavedAudio = data => {
					BDFDB.NotificationUtils.toast(`Sound ${data.sound} was added to category ${data.category}.`, {type: "success"});
					if (!audios[data.category]) audios[data.category] = {};
					audios[data.category][data.sound] = data.source;
					BDFDB.DataUtils.save(audios, this, "audios");
					BDFDB.PluginUtils.refreshSettingsPanel(this, settingsPanel, collapseStates);
					
				};
				
				let settingsPanel;
				return settingsPanel = BDFDB.PluginUtils.createSettingsPanel(this, {
					collapseStates: collapseStates,
					children: _ => {
						let settingsItems = [];
						
						settingsItems.push(BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.CollapseContainer, {
							title: "Settings",
							collapseStates: collapseStates,
							children: [
								...Object.keys(volumes).map(key => BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SettingsSaveItem, {
									type: "Slider",
									plugin: this,
									keys: ["volumes", key],
									basis: "50%",
									label: this.defaults.volumes[key].description,
									value: volumes[key]
								})),
								...Object.keys(toggles).map(key => BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SettingsSaveItem, {
									type: "Switch",
									plugin: this,
									keys: ["toggles", key],
									label: this.defaults.toggles[key].description,
									value: toggles[key]
								}))
							]
						}));
					
						settingsItems.push(BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.CollapseContainer, {
							title: "Add new Sound",
							collapseStates: collapseStates,
							children: [
								BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex, {
									className: BDFDB.disCN.margintop4,
									children: [
										BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex.Child, {
											children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormItem, {
												title: "Categoryname",
												children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.TextInput, {
													className: "input-newsound input-category",
													value: "",
													placeholder: "Categoryname"
												})
											})
										}),
										BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex.Child, {
											children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormItem, {
												title: "Soundname",
												children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.TextInput, {
													className: "input-newsound input-sound",
													value: "",
													placeholder: "Soundname"
												})
											})
										})
									]
								}),
								BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex, {
									className: BDFDB.disCN.margintop4,
									align: BDFDB.LibraryComponents.Flex.Align.END,
									children: [
										BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex.Child, {
											children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormItem, {
												title: "Source",
												children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.TextInput, {
													className: "input-newsound input-source",
													type: "file",
													filter: ["audio", "video"],
													value: "",
													placeholder: "Source"
												})
											})
										}),
										BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Button, {
											style: {marginBottom: 4},
											onClick: _ => {
												for (let input of settingsPanel.props._node.querySelectorAll(".input-newsound " + BDFDB.dotCN.input)) if (!input.value || input.value.length == 0 || input.value.trim().length == 0) return BDFDB.NotificationUtils.toast("Fill out all Fields to add a new Sound", {type: "danger"});
												let category = settingsPanel.props._node.querySelector(".input-category " + BDFDB.dotCN.input).value.trim();
												let sound = settingsPanel.props._node.querySelector(".input-sound " + BDFDB.dotCN.input).value.trim();
												let source = settingsPanel.props._node.querySelector(".input-source " + BDFDB.dotCN.input);
												let value = source && (source.getAttribute("file") || source.value).trim();
												if (value.indexOf("http") == 0) BDFDB.LibraryRequires.request(value, (error, response, result) => {
													if (response) {
														let type = response.headers["content-type"];
														if (type && (type.indexOf("octet-stream") > -1 || type.indexOf("audio") > -1 || type.indexOf("video") > -1)) return successSavedAudio({category, sound, source: value});
													}
													BDFDB.NotificationUtils.toast("Use a valid direct link to a video or audio source, they usually end on something like .mp3, .mp4 or .wav", {type: "danger"});
												});
												else if (value.indexOf("data:") == 0) return successSavedAudio({category, sound, source: value});
											},
											children: BDFDB.LanguageUtils.LanguageStrings.SAVE
										})
									]
								})
							]
						}));
						
						settingsItems.push(BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.CollapseContainer, {
							title: "Sound Configuration",
							collapseStates: collapseStates,
							children: Object.keys(types).map(type => type == "message3" && !BDFDB.LibraryStores.NotificationSettingsStore.getNotifyMessagesInSelectedChannel() ? null : [
								BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex, {
									className: BDFDB.disCN.marginbottom8,
									align: BDFDB.LibraryComponents.Flex.Align.CENTER,
									direction: BDFDB.LibraryComponents.Flex.Direction.HORIZONTAL,
									children: [
										BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SettingsLabel, {
											label: types[type].name
										}),
										["mute", "streamMute", "invisibleMute"].some(n => types[type][n] !== null) && BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Clickable, {
											onClick: event => BDFDB.ContextMenuUtils.open(this, event, BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuGroup, {
												children: [
													{key: "mute", label: ["Mute in", BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.StatusComponents.Status, {style: {marginLeft: 6}, size: 12, status: BDFDB.LibraryComponents.StatusComponents.Types.DND})]},
													{key: "invisibleMute", label: ["Mute in", BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.StatusComponents.Status, {style: {marginLeft: 6}, size: 12, status: BDFDB.LibraryComponents.StatusComponents.Types.INVISIBLE})]},
													{key: "streamMute", label: ["Mute while", BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.StatusComponents.Status, {style: {marginLeft: 6}, size: 12, status: BDFDB.LibraryComponents.StatusComponents.Types.STREAMING})]}
												].map(n => types[type][n.key] !== null && BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuCheckboxItem, {
													label: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex, {
														align: BDFDB.LibraryComponents.Flex.Align.CENTER,
														children: n.label
													}),
													hint: n.hint,
													id: BDFDB.ContextMenuUtils.createItemId(this.name, type, n.key),
													checked: choices[type][n.key],
													action: state => {
														choices[type][n.key] = state;
														this.saveChoice(type, false);
													}
												})).filter(n => n)
											})),
											children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.SvgIcon, {
												width: 20,
												height: 20,
												name: BDFDB.LibraryComponents.SvgIcon.Names.COG
											})
										})
									].filter(n => n)
								}),
								BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex, {
									className: BDFDB.disCN.marginbottom8,
									children: [
										BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex.Child, {
											grow: 0,
											shrink: 0,
											basis: "31%",
											children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormItem, {
												title: "Category",
												children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Select, {
													value: choices[type].category,
													options: Object.keys(audios).map(name => ({value: name, label: name})),
													searchable: true,
													onChange: value => {
														const categorySounds = audios[value] || {};
														choices[type].category = value;
														choices[type].sound = categorySounds[types[type].name] ? types[type].name : Object.keys(categorySounds)[0];
														this.saveChoice(type, true);
														BDFDB.PluginUtils.refreshSettingsPanel(this, settingsPanel, collapseStates);
													}
												})
											})
										}),
										BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex.Child, {
											grow: 0,
											shrink: 0,
											basis: "31%",
											children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormItem, {
												title: "Sound",
												children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Select, {
													value: choices[type].sound,
													options: Object.keys(audios[choices[type].category] || {}).map(name => ({value: name, label: name})),
													searchable: true,
													onChange: value => {
														choices[type].sound = value;
														this.saveChoice(type, true);
														BDFDB.PluginUtils.refreshSettingsPanel(this, settingsPanel, collapseStates);
													}
												})
											})
										}),
										BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex.Child, {
											grow: 0,
											shrink: 0,
											basis: "31%",
											children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormItem, {
												title: "Volume",
												children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Slider, {
													defaultValue: choices[type].volume,
													digits: 1,
													onValueRender: value => {
														return value + "%";
													},
													onValueChange: value => {
														choices[type].volume = value;
														this.saveChoice(type, true);
													}
												})
											})
										})
									]
								}),
								BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormDivider, {
									className: BDFDB.disCN.marginbottom8
								})
							]).flat(10).filter(n => n)
						}));
						
						let removeableCategories = [{value: removeAllKey, label: BDFDB.LanguageUtils.LanguageStrings.FORM_LABEL_ALL}].concat(Object.keys(audios).filter(category => !(defaultAudios[category] && !Object.keys(audios[category] || {}).filter(sound => defaultAudios[category][sound] === undefined).length)).map(name => ({value: name, label: name})));
						let removeableSounds = {};
						for (let category of removeableCategories) removeableSounds[category.value] = [{value: removeAllKey, label: BDFDB.LanguageUtils.LanguageStrings.FORM_LABEL_ALL}].concat(Object.keys(audios[category.value] || {}).filter(sound => !(defaultAudios[category.value] && defaultAudios[category.value][sound] !== undefined)).map(name => ({value: name, label: name})));
						settingsItems.push(BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.CollapseContainer, {
							title: "Remove Sounds",
							collapseStates: collapseStates,
							children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex, {
								className: BDFDB.disCN.margintop4,
								align: BDFDB.LibraryComponents.Flex.Align.END,
								children: [
									BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex.Child, {
										grow: 0,
										shrink: 0,
										basis: "35%",
										children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormItem, {
											title: "Category",
											children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Select, {
												key: "REMOVE_CATEGORY",
												value: removeAllKey,
												options: removeableCategories,
												searchable: true,
												onChange: (category, instance) => {
													let soundSelectIns = BDFDB.ReactUtils.findOwner(BDFDB.ReactUtils.findOwner(instance, {name: ["BDFDB_Modal", "BDFDB_SettingsPanel"], up: true}), {key: "REMOVE_SOUND"});
													if (soundSelectIns && removeableSounds[category]) {
														soundSelectIns.props.options = removeableSounds[category];
														soundSelectIns.props.value = removeAllKey;
														BDFDB.ReactUtils.forceUpdate(soundSelectIns);
													}
												}
											})
										})
									}),
									BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex.Child, {
										grow: 0,
										shrink: 0,
										basis: "35%",
										children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.FormItem, {
											title: "Sound",
											children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Select, {
												key: "REMOVE_SOUND",
												value: removeAllKey,
												options: removeableSounds[removeAllKey],
												searchable: true
											})
										})
									}),
									BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Flex.Child, {
										grow: 0,
										shrink: 1,
										basis: "25%",
										children: BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.Button, {
											style: {marginBottom: 4},
											color: BDFDB.LibraryComponents.Button.Colors.RED,
											onClick: (event, instance) => {
												let wrapperIns = BDFDB.ReactUtils.findOwner(instance, {name: ["BDFDB_Modal", "BDFDB_SettingsPanel"], up: true});
												let categorySelectIns = BDFDB.ReactUtils.findOwner(wrapperIns, {key: "REMOVE_CATEGORY"});
												let soundSelectIns = BDFDB.ReactUtils.findOwner(wrapperIns, {key: "REMOVE_SOUND"});
												if (categorySelectIns && soundSelectIns) {
													let soundAmount = 0;
													let catAll = categorySelectIns.props.value == removeAllKey;
													let soundAll = soundSelectIns.props.value == removeAllKey;
													if (catAll) soundAmount = BDFDB.ArrayUtils.sum(Object.keys(audios).map(category => Object.keys(audios[category] || {}).filter(sound => !(defaultAudios[category] && defaultAudios[category][sound] !== undefined)).length));
													else if (soundAll) soundAmount = Object.keys(audios[categorySelectIns.props.value] || {}).filter(sound => !(defaultAudios[categorySelectIns.props.value] && defaultAudios[categorySelectIns.props.value][sound] !== undefined)).length;
													else if (audios[categorySelectIns.props.value][soundSelectIns.props.value]) soundAmount = 1;
													
													if (soundAmount) BDFDB.ModalUtils.confirm(this, `Are you sure you want to delete ${soundAmount} added Sound${soundAmount == 1 ? "" : "s"}?`, _ => {
														if (catAll) BDFDB.DataUtils.remove(this, "audios");
														else if (soundAll) BDFDB.DataUtils.remove(this, "audios", categorySelectIns.props.value);
														else {
															delete audios[categorySelectIns.props.value][soundSelectIns.props.value];
															if (BDFDB.ObjectUtils.isEmpty(audios[categorySelectIns.props.value])) delete audios[categorySelectIns.props.value];
															BDFDB.DataUtils.save(audios, this, "audios");
														}
														this.loadAudios();
														this.loadChoices();
														BDFDB.PluginUtils.refreshSettingsPanel(this, settingsPanel, collapseStates);
													});
													else BDFDB.NotificationUtils.toast("No Sounds to delete", {type: "danger"});
												}
											},
											children: BDFDB.LanguageUtils.LanguageStrings.DELETE
										})
									})
								]
							})
						}));
						
						return settingsItems;
					}
				});
			}

			onSettingsClosed () {
				if (this.SettingsUpdated) {
					delete this.SettingsUpdated;
					for (let type in createdAudios) if (createdAudios[type]) createdAudios[type].stop();
					createdAudios = {};
					this.forceUpdateAll();
				}
			}
		
			forceUpdateAll () {
				volumes = BDFDB.DataUtils.get(this, "volumes");
				toggles = BDFDB.DataUtils.get(this, "toggles");
				
				BDFDB.PatchUtils.forceAllUpdates(this);
				BDFDB.DiscordUtils.rerenderAll();
			}
			
			loadAudios () {
				audios = Object.assign({}, BDFDB.DataUtils.load(this, "audios"), defaultAudios);
				BDFDB.DataUtils.save(BDFDB.ObjectUtils.exclude(audios, Object.keys(defaultAudios)), this, "audios");
			}

			loadChoices () {
				let loadedChoices = BDFDB.DataUtils.load(this, "choices");
				for (let type in types) {
					let choice = loadedChoices[type] || {}, soundFound = false;
					for (let category in audios) if (choice.category == category) for (let sound in audios[category]) if (choice.sound == sound) {
						soundFound = true;
						break;
					}
					if (!soundFound) choice = {
						category: "---",
						sound: "---",
						volume: 100,
						mute: types[type].mute,
						streamMute: types[type].streamMute,
						invisibleMute: types[type].invisibleMute
					};
					choices[type] = choice;
					this.saveChoice(type, false);
				}
			}

			saveChoice (type, play) {
				if (!choices[type]) return;
				BDFDB.DataUtils.save(choices[type], this, "choices", type);
				if (play) {
					this.SettingsUpdated = true;
					this.playAudio(type);
				}
			}

			playAudio (type, functionCall = "play", duration = 0) {
				type = soundPacks.some(soundPack => type.startsWith(soundPack + "_")) ? type.split("_").splice(1).join("_") : type;
				if (this.dontPlayAudio(type) || BDFDB.LibraryStores.StreamerModeStore.disableSounds) return;
				if (createdAudios[type]) createdAudios[type].stop();
				createdAudios[type] = new WebAudioSound(type);
				return createdAudios[type][typeof createdAudios[type][functionCall] == "function" ? functionCall : "play"](duration);
			}
			
			isSuppressMentionsEnabled (guildId, channelId) {
				let channelSettings = BDFDB.LibraryStores.UserGuildSettingsStore.getChannelMessageNotifications(guildId, channelId);
				return channelSettings && (channelSettings == BDFDB.DiscordConstants.UserNotificationSettings.NO_MESSAGES || channelSettings == BDFDB.DiscordConstants.UserNotificationSettings.NULL && BDFDB.LibraryStores.UserGuildSettingsStore.getMessageNotifications(guildId) == BDFDB.DiscordConstants.UserNotificationSettings.NO_MESSAGES);
			}

			dontPlayAudio (type) {
				let status = BDFDB.UserUtils.getStatus();
				return choices[type] && (choices[type].mute && status == "dnd" || choices[type].streamMute && status == "streaming" || choices[type].invisibleMute && (status == "offline" || status == "invisible"));
			}

			fireEvent (type) {
				firedEvents[type] = true;
				BDFDB.TimeUtils.timeout(_ => delete firedEvents[type], 3000);
			}
			
			isSoundUsedAnywhere (type) {
				return type && type.indexOf("poggermode_") != 0 && type != "human_man" && type != "robot_man" && type != "discodo" && type != "overlayunlock" && type != "call_ringing_beat" && !(type != "message1" && type != "message3" && /\d$/.test(type));
			}
		};
	})(window.BDFDB_Global.PluginUtils.buildPlugin(changeLog));
})();
