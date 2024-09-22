let currentUserId = null;

const setCurrentUserId = (userId) => {
    currentUserId = userId;
};

const getCurrentUserId = () => currentUserId;

module.exports = { setCurrentUserId, getCurrentUserId };