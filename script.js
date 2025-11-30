var player;
var isPlaying = false;

// Main playlist
var playlist = [
    'n_Dxix0lvDM', 'hLDull8aPDw', '7GIWV__qx4M', 'ZEZRa41ury4',
    'b4dbjk2HcYo', 'UWdCGihgiX8', 'ZHGonUUMeO8', 'uF9xZPwaIUY',
    'DepK5YBmWfA', 'MQYmjpdA_Pw', 'LjyToU14TBM', 'z2NNo23Q9do'
];

// Easter egg songs (3% chance)
var easterEggSongs = [
    '3jF5hK3h0wk', 'oIyRzl8zVWE'
];

var currentVideoId = null;
var songHistory = []; // Stack to store history of played song IDs
var fadeInterval;
var progressInterval;
var isDraggingSlider = false;

function onYouTubeIframeAPIReady() {
    // Pick a random start song from the main playlist
    currentVideoId = playlist[Math.floor(Math.random() * playlist.length)];

    player = new YT.Player('youtube-player', {
        height: '0',
        width: '0',
        videoId: currentVideoId,
        playerVars: {
            'playsinline': 1,
            'controls': 0,
            'origin': window.location.origin
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

function onPlayerError(event) {
    console.error('YouTube Player Error:', event.data);
}

function onPlayerReady(event) {
    const volumeSlider = document.getElementById('volume-slider');
    if (player && player.setVolume) {
        player.setVolume(volumeSlider.value);
    }
    updateSliderTrail(volumeSlider); // Init volume trail
    updateSongInfo();
    updateAlbumArt(currentVideoId);
}

function onPlayerStateChange(event) {
    // Sync UI if needed
    if (event.data === YT.PlayerState.PLAYING) {
        startProgressLoop();
        updateSongInfo();
    } else {
        stopProgressLoop();
    }

    if (event.data === YT.PlayerState.ENDED) {
        // Auto-play next random song when ended
        playNextRandomSong();
    }
}

function updateSongInfo() {
    if (player && player.getVideoData) {
        const videoData = player.getVideoData();
        if (videoData) {
            if (videoData.title) {
                document.getElementById('song-title').textContent = videoData.title;
            }
            if (videoData.author) {
                document.getElementById('channel-name').textContent = "Published by " + videoData.author;
            }
        }
    }
}

function updateAlbumArt(videoId) {
    const imgUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    document.getElementById('album-art').src = imgUrl;
}

function startProgressLoop() {
    stopProgressLoop();
    progressInterval = setInterval(updateProgressBar, 500);
}

function stopProgressLoop() {
    clearInterval(progressInterval);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateProgressBar() {
    if (!player || !player.getCurrentTime || !player.getDuration || isDraggingSlider) return;

    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();

    if (duration > 0) {
        const percentage = (currentTime / duration) * 100;
        const progressSlider = document.getElementById('progress-slider');
        progressSlider.value = percentage;
        updateSliderTrail(progressSlider);

        // Update time display
        const timeString = `${formatTime(currentTime)} / ${formatTime(duration)}`;
        document.getElementById('time-display').textContent = timeString;
    }
}

function updateSliderTrail(slider) {
    const min = slider.min || 0;
    const max = slider.max || 100;
    const value = slider.value;
    const percentage = ((value - min) / (max - min)) * 100;

    slider.style.background = `linear-gradient(to right, #FAE6C8 0%, #FAE6C8 ${percentage}%, #FAD9E1 ${percentage}%, #FAD9E1 100%)`;
}

function getRandomVideoId() {
    // 1% chance for easter egg
    if (Math.random() < 0.01) {
        return easterEggSongs[Math.floor(Math.random() * easterEggSongs.length)];
    }

    // Otherwise pick from main playlist
    let newId;
    do {
        newId = playlist[Math.floor(Math.random() * playlist.length)];
    } while (newId === currentVideoId && playlist.length > 1);

    return newId;
}

function fadeIn() {
    if (!player) return;
    clearInterval(fadeInterval);

    const targetVolume = document.getElementById('volume-slider').value;
    player.setVolume(0);
    player.playVideo();

    let vol = 0;
    fadeInterval = setInterval(() => {
        vol += 5; // Increase volume
        if (vol >= targetVolume) {
            vol = targetVolume;
            clearInterval(fadeInterval);
        }
        player.setVolume(vol);
    }, 100); // Run every 100ms
}

function fadeOut(callback) {
    if (!player) return;
    clearInterval(fadeInterval);

    let vol = player.getVolume();
    fadeInterval = setInterval(() => {
        vol -= 5; // Decrease volume
        if (vol <= 0) {
            vol = 0;
            clearInterval(fadeInterval);
            if (callback) callback();
        }
        player.setVolume(vol);
    }, 100);
}

function playNextRandomSong() {
    // Save current song to history before changing
    if (currentVideoId) {
        songHistory.push(currentVideoId);
    }

    currentVideoId = getRandomVideoId();
    loadAndPlaySong(currentVideoId);
}

function playPreviousSong() {
    if (songHistory.length > 0) {
        // Pop the last song ID from history
        currentVideoId = songHistory.pop();
        loadAndPlaySong(currentVideoId);
    } else {
        // If no history, restart current
        if (player && player.seekTo) {
            player.seekTo(0);
        }
    }
}

function loadAndPlaySong(videoId) {
    player.loadVideoById(videoId);
    const progressSlider = document.getElementById('progress-slider');
    progressSlider.value = 0; // Reset slider
    updateSliderTrail(progressSlider);

    document.getElementById('song-title').textContent = "Loading...";
    document.getElementById('channel-name').textContent = "";
    document.getElementById('time-display').textContent = "00:00 / 00:00";

    updateAlbumArt(videoId);

    fadeIn();
    isPlaying = true;
    document.getElementById('play-toggle').textContent = '■';
}

document.getElementById('play-toggle').addEventListener('click', function () {
    if (!player || !player.playVideo) return;

    const playToggle = document.getElementById('play-toggle');

    if (isPlaying) {
        // Fade out then pause
        playToggle.textContent = '▶'; // Immediate feedback
        isPlaying = false;
        fadeOut(() => {
            player.pauseVideo();
        });
    } else {
        // Fade in
        playToggle.textContent = '■'; // Immediate feedback
        isPlaying = true;
        fadeIn();
    }
});

document.getElementById('prev-btn').addEventListener('click', function () {
    if (!player) return;
    fadeOut(() => {
        playPreviousSong();
    });
});

document.getElementById('next-btn').addEventListener('click', function () {
    if (!player) return;
    fadeOut(() => {
        playNextRandomSong();
    });
});

const volumeSlider = document.getElementById('volume-slider');
volumeSlider.addEventListener('input', function () {
    updateSliderTrail(this);
    if (player && player.setVolume) {
        clearInterval(fadeInterval); // Stop any fade if user manually adjusts
        player.setVolume(this.value);
    }
});

const progressSlider = document.getElementById('progress-slider');
progressSlider.addEventListener('input', function () {
    isDraggingSlider = true;
    updateSliderTrail(this);
});

progressSlider.addEventListener('change', function () {
    isDraggingSlider = false;
    if (player && player.seekTo && player.getDuration) {
        const duration = player.getDuration();
        const seekTime = (this.value / 100) * duration;
        player.seekTo(seekTime);
    }
});

// Initialize trails on load
document.addEventListener('DOMContentLoaded', () => {
    updateSliderTrail(document.getElementById('progress-slider'));
    updateSliderTrail(document.getElementById('volume-slider'));
});
